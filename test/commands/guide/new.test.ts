import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import GuideValidate from "@/commands/guide/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const files = ["a/b/c/foo.txt"];
const currCwd = process.cwd();

const messageTypes = [
  factory.messageType({ key: "banner", name: "Banner" }),
  factory.messageType({ key: "modal", name: "Modal" }),
];

const setupWithStub = (guide?: any) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listAllMessageTypes", (stub) =>
      stub.callsFake(async () => {
        return messageTypes;
      }),
    )
    .stub(KnockApiV1.prototype, "getGuide", (stub) =>
      stub.resolves(
        guide
          ? factory.resp({ status: 200, data: guide })
          : factory.resp({ status: 404 }),
      ),
    );

describe("commands/guide/new", () => {
  before(() => {
    fs.removeSync(sandboxDir);

    for (const relpath of files) {
      const abspath = path.join(sandboxDir, relpath);
      fs.ensureFileSync(abspath);
    }

    // Create a valid guide.json in a/b directory for testing
    const guideJsonPath = path.join(sandboxDir, "a", "b", "guide.json");
    fs.outputJsonSync(guideJsonPath, {
      name: "Existing Guide",
      steps: [],
    });
  });
  beforeEach(() => {
    process.chdir(sandboxDir);
  });
  after(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("if invoked inside another guide directory", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a", "b");
        process.chdir(newCwd);
      })
      .command([
        "guide new",
        "--name",
        "My New Guide",
        "--key",
        "my-new-guide",
        "--message-type",
        "banner",
        "--force",
      ])
      .catch("Cannot create a new guide inside an existing guide directory")
      .it("throws an error");
  });

  describe("given an invalid guide key, with uppercase chars", () => {
    setupWithStub()
      .command([
        "guide new",
        "--name",
        "My New Guide",
        "--key",
        "My-New-Guide",
        "--message-type",
        "banner",
        "--force",
      ])
      .catch((error) => expect(error.message).to.match(/^Invalid guide key/))
      .it("throws an error");
  });

  describe("given both --template and --message-type flags", () => {
    setupWithStub()
      .command([
        "guide new",
        "--name",
        "My New Guide",
        "--key",
        "my-new-guide",
        "--template",
        "guides/banner",
        "--message-type",
        "banner",
        "--force",
      ])
      .catch((error) =>
        expect(error.message).to.match(
          /Cannot use both --template and --message-type flags together/,
        ),
      )
      .it("throws an error");
  });

  describe("given a guide key for an existing directory", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);
      })
      .command([
        "guide new",
        "--name",
        "My New Guide",
        "--key",
        "b",
        "--force",
        "--message-type",
        "banner",
      ])
      .it("writes a guide dir to the file system", () => {
        const exists = fs.pathExistsSync(
          path.resolve(sandboxDir, "a", "b", "guide.json"),
        );

        expect(exists).to.equal(true);
      });
  });

  describe("given a nonexistent message type", () => {
    setupWithStub()
      .command([
        "guide new",
        "--key",
        "my-new-guide",
        "--name",
        "My New Guide",
        "--message-type",
        "nonexistent",
        "--force",
      ])
      .catch((error) =>
        expect(error.message).to.match(/Message type `nonexistent` not found/),
      )
      .it("throws an error");
  });

  describe("given a valid guide key and a message type flag", () => {
    let guideValidateAllStub: sinon.SinonStub;
    let upsertGuideStub: sinon.SinonStub;

    beforeEach(() => {
      guideValidateAllStub = sinon
        .stub(GuideValidate, "validateAll")
        .resolves([]);
      upsertGuideStub = sinon
        .stub(KnockApiV1.prototype, "upsertGuide")
        .resolves(
          factory.resp({
            status: 200,
            data: {
              guide: factory.guide({
                key: "my-new-guide",
                name: "My New Guide",
              }),
            },
          }),
        );
    });

    afterEach(() => {
      sinon.restore();
    });

    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);
      })
      .command([
        "guide new",
        "--key",
        "my-new-guide",
        "--name",
        "My New Guide",
        "--force",
        "--push",
        "--message-type",
        "banner",
      ])
      .it("generates a new guide dir with a scaffolded guide.json", () => {
        sinon.assert.calledOnce(guideValidateAllStub);
        sinon.assert.calledOnce(upsertGuideStub);

        const exists = fs.pathExistsSync(
          path.resolve(sandboxDir, "a", "my-new-guide", "guide.json"),
        );

        expect(exists).to.equal(true);

        // Read the guide.json and verify it has the expected structure
        const guideJson = fs.readJsonSync(
          path.resolve(sandboxDir, "a", "my-new-guide", "guide.json"),
        );

        expect(guideJson.name).to.equal("My New Guide");
        expect(guideJson.steps).to.be.an("array");
        expect(guideJson.steps[0]).to.have.property("ref", "step_1");
        expect(guideJson.steps[0]).to.have.property("schema_key", "banner");
        expect(guideJson.steps[0]).to.have.property("values");
      });
  });

  describe("given a valid guide key and a template flag", () => {
    setupWithStub()
      .command([
        "guide new",
        "--key",
        "my-new-guide",
        "--name",
        "My New Guide",
        "--template",
        // Note: this would need to be a real template from the templates repo
        "guides/banner",
        "--force",
      ])
      .catch((error) => {
        // Template download will fail in test environment, which is expected
        expect(error.message).to.match(
          /Failed to generate guide from template/,
        );
      })
      .it("attempts to generate from template");
  });
});
