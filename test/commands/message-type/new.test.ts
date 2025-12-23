import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const files = ["a/b/message_type.json", "a/b/c/foo.txt"];
const currCwd = process.cwd();

const setupWithStub = (messageType?: any) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getMessageType", (stub) =>
      stub.resolves(
        messageType
          ? factory.resp({ status: 200, data: messageType })
          : factory.resp({ status: 404 }),
      ),
    );

describe("commands/message-type/new", () => {
  before(() => {
    fs.removeSync(sandboxDir);

    for (const relpath of files) {
      const abspath = path.join(sandboxDir, relpath);
      fs.ensureFileSync(abspath);
    }
  });
  beforeEach(() => {
    process.chdir(sandboxDir);
  });
  after(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("if invoked inside another message type directory", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a", "b");
        process.chdir(newCwd);
      })
      .command([
        "message-type new",
        "--name",
        "My New Message Type",
        "--key",
        "my-new-message-type",
      ])
      .catch(
        "Cannot create a new message type inside an existing message_type directory",
      )
      .it("throws an error");
  });

  describe("given an invalid message type key, with uppercase chars", () => {
    setupWithStub()
      .command([
        "message-type new",
        "--name",
        "My New Message Type",
        "--key",
        "My-New-Message-Type",
      ])
      .catch((error) =>
        expect(error.message).to.match(/^Invalid message type key/),
      )
      .it("throws an error");
  });

  describe("given a message type key for an existing directory", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);
      })
      .command([
        "message-type new",
        "--name",
        "My New Message Type",
        "--key",
        "b",
        "--force",
      ])
      .it("writes a message type dir to the file system", () => {
        const exists = fs.pathExistsSync(
          path.resolve(sandboxDir, "a", "b", "message_type.json"),
        );

        expect(exists).to.equal(true);
      });
  });

  describe("given a valid message type key and name (without push)", () => {
    setupWithStub()
      .do(() => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);
      })
      .command([
        "message-type new",
        "--key",
        "my-new-message-type",
        "--name",
        "My New Message Type",
        "--force",
      ])
      .it(
        "generates a new message type dir with a scaffolded message_type.json",
        () => {
          const messageTypeJsonPath = path.resolve(
            sandboxDir,
            "a",
            "my-new-message-type",
            "message_type.json",
          );

          expect(fs.pathExistsSync(messageTypeJsonPath)).to.equal(true);

          const messageTypeJson = fs.readJsonSync(messageTypeJsonPath);
          expect(messageTypeJson.name).to.equal("My New Message Type");
          expect(messageTypeJson["preview@"]).to.equal("preview.txt");
          expect(messageTypeJson.variants).to.be.an("array");
          expect(messageTypeJson.variants).to.have.lengthOf(1);
          expect(messageTypeJson.variants[0].key).to.equal("default");
        },
      );
  });

  describe("given a valid message type key", () => {
    setupWithStub()
      .command([
        "message-type new",
        "--key",
        "message-type-basic",
        "--name",
        "Message Type Basic",
        "--force",
      ])
      .it("generates a message type dir with empty description", () => {
        const messageTypeJsonPath = path.resolve(
          sandboxDir,
          "message-type-basic",
          "message_type.json",
        );

        expect(fs.pathExistsSync(messageTypeJsonPath)).to.equal(true);

        const messageTypeJson = fs.readJsonSync(messageTypeJsonPath);
        expect(messageTypeJson.name).to.equal("Message Type Basic");
        expect(messageTypeJson.description).to.equal("");
      });
  });

  describe("given a valid message type key", () => {
    setupWithStub()
      .command([
        "message-type new",
        "--key",
        "message-type-with-preview",
        "--name",
        "Message Type With Preview",
        "--force",
      ])
      .it("generates a message type dir with preview file", () => {
        const messageTypeJsonPath = path.resolve(
          sandboxDir,
          "message-type-with-preview",
          "message_type.json",
        );
        const previewFilePath = path.resolve(
          sandboxDir,
          "message-type-with-preview",
          "preview.txt",
        );

        expect(fs.pathExistsSync(messageTypeJsonPath)).to.equal(true);
        expect(fs.pathExistsSync(previewFilePath)).to.equal(true);

        const messageTypeJson = fs.readJsonSync(messageTypeJsonPath);
        expect(messageTypeJson["preview@"]).to.equal("preview.txt");

        const previewContent = fs.readFileSync(previewFilePath, "utf-8");
        expect(previewContent).to.include("{{ name }}");
      });
  });

  describe("verifying preview file structure", () => {
    setupWithStub()
      .command([
        "message-type new",
        "--key",
        "preview-test",
        "--name",
        "Preview Test",
        "--force",
      ])
      .it("generates preview with proper content", () => {
        const previewFilePath = path.resolve(
          sandboxDir,
          "preview-test",
          "preview.txt",
        );

        expect(fs.pathExistsSync(previewFilePath)).to.equal(true);

        const previewContent = fs.readFileSync(previewFilePath, "utf-8");
        expect(previewContent).to.equal("{{ name }}");
      });
  });

  describe("verifying message_type.json structure", () => {
    setupWithStub()
      .command([
        "message-type new",
        "--key",
        "message-type-json-test",
        "--name",
        "Message Type JSON Test",
        "--force",
      ])
      .it(
        "generates message_type.json with proper file references using @ marker",
        () => {
          const messageTypeJsonPath = path.resolve(
            sandboxDir,
            "message-type-json-test",
            "message_type.json",
          );

          expect(fs.pathExistsSync(messageTypeJsonPath)).to.equal(true);

          const messageTypeJson = fs.readJsonSync(messageTypeJsonPath);
          expect(messageTypeJson.name).to.equal("Message Type JSON Test");
          expect(messageTypeJson["preview@"]).to.equal("preview.txt");
          expect(messageTypeJson.preview).to.be.undefined;
          expect(messageTypeJson.variants).to.be.an("array");
          expect(messageTypeJson.variants[0]).to.deep.equal({
            key: "default",
            name: "Default",
            fields: [],
          });
        },
      );
  });

  describe("verifying variants structure", () => {
    setupWithStub()
      .command([
        "message-type new",
        "--key",
        "variants-test",
        "--name",
        "Variants Test",
        "--force",
      ])
      .it("generates message type with default variant", () => {
        const messageTypeJsonPath = path.resolve(
          sandboxDir,
          "variants-test",
          "message_type.json",
        );

        expect(fs.pathExistsSync(messageTypeJsonPath)).to.equal(true);

        const messageTypeJson = fs.readJsonSync(messageTypeJsonPath);
        expect(messageTypeJson.variants).to.be.an("array");
        expect(messageTypeJson.variants).to.have.lengthOf(1);
        expect(messageTypeJson.variants[0].key).to.equal("default");
        expect(messageTypeJson.variants[0].name).to.equal("Default");
        expect(messageTypeJson.variants[0].fields).to.be.an("array");
        expect(messageTypeJson.variants[0].fields).to.have.lengthOf(0);
      });
  });

  describe("given a valid message type key and a template flag", () => {
    setupWithStub()
      .command([
        "message-type new",
        "--key",
        "template-message-type",
        "--name",
        "Template Message Type",
        "--template",
        // Note: this would need to be a real template from the templates repo
        // For testing, we expect this to fail gracefully if the template doesn't exist
        "message-types/nonexistent-template",
        "--force",
      ])
      .catch((error) =>
        expect(error.message).to.match(
          /Failed to generate message type from template/,
        ),
      )
      .it("attempts to generate from template");
  });
});
