import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";

import { factory, xpath } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { BROADCAST_JSON } from "@/lib/marshal/broadcast";

const currCwd = process.cwd();

const channels = [
  factory.channel({ key: "postmark", type: "email" }),
  factory.channel({ key: "knock-in-app-feed", type: "in_app_feed" }),
];

const setupWithStub = (stubChannels = channels) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listAllChannels", (stub) =>
      stub.resolves(stubChannels),
    );

describe("commands/broadcast/new", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given name and key flags with --force", () => {
    setupWithStub()
      .stdout()
      .command([
        "broadcast new",
        "--name",
        "My New Broadcast",
        "--key",
        "my-new-broadcast",
        "--steps",
        "email",
        "--force",
      ])
      .it("creates a broadcast directory with a scaffolded email step", () => {
        const broadcastPath = path.resolve(
          sandboxDir,
          "my-new-broadcast",
          BROADCAST_JSON,
        );
        expect(fs.pathExistsSync(broadcastPath)).to.equal(true);

        const content = fs.readJsonSync(broadcastPath);
        expect(content.key).to.equal("my-new-broadcast");
        expect(content.name).to.equal("My New Broadcast");
        expect(content.status).to.equal(undefined);
        expect(content.settings.is_commercial).to.equal(undefined);
        expect(content.steps).to.eql([
          {
            ref: "email_1",
            type: "channel",
            channel_key: "postmark",
            template: {
              settings: { layout_key: "default" },
              subject: "You've got mail!",
              "html_body@": xpath("email_1/html_body.html"),
            },
          },
        ]);

        const htmlBodyPath = path.resolve(
          sandboxDir,
          "my-new-broadcast",
          "email_1",
          "html_body.html",
        );
        expect(fs.readFileSync(htmlBodyPath, "utf8")).to.contain(
          "{{ recipient.name }}",
        );
      });
  });

  describe("given multiple channel steps", () => {
    setupWithStub()
      .stdout()
      .command([
        "broadcast new",
        "--name",
        "Multi",
        "--key",
        "multi",
        "--steps",
        "email,in-app-feed",
        "--force",
      ])
      .it("scaffolds one step per channel type", () => {
        const content = fs.readJsonSync(
          path.resolve(sandboxDir, "multi", BROADCAST_JSON),
        );
        expect(content.steps.map((s: any) => [s.ref, s.channel_key])).to.eql([
          ["email_1", "postmark"],
          ["in_app_feed_1", "knock-in-app-feed"],
        ]);
      });
  });

  describe("given a step type that is not a broadcast channel step", () => {
    for (const steps of ["delay", "in_app_guide", "sms"]) {
      setupWithStub()
        .command([
          "broadcast new",
          "--name",
          "My New Broadcast",
          "--key",
          "my-new-broadcast",
          "--steps",
          steps,
          "--force",
        ])
        .catch((error) =>
          expect(error.message).to.match(
            /^Invalid --steps .*Invalid step type/,
          ),
        )
        .it(`throws an error for --steps ${steps}`, () => {
          expect(
            fs.pathExistsSync(path.resolve(sandboxDir, "my-new-broadcast")),
          ).to.equal(false);
        });
    }
  });

  describe("given an empty --steps flag", () => {
    setupWithStub()
      .command([
        "broadcast new",
        "--name",
        "My New Broadcast",
        "--key",
        "my-new-broadcast",
        "--steps",
        "",
        "--force",
      ])
      .catch(/at least one channel step is required/)
      .it("throws an error");
  });

  describe("given an account with no messaging channels", () => {
    setupWithStub([])
      .command([
        "broadcast new",
        "--name",
        "My New Broadcast",
        "--key",
        "my-new-broadcast",
        "--steps",
        "email",
        "--force",
      ])
      .catch(/no email, in-app feed, SMS, push, or chat channels/)
      .it("throws an error");
  });

  describe("given an invalid broadcast key, with uppercase chars", () => {
    setupWithStub()
      .command([
        "broadcast new",
        "--name",
        "My New Broadcast",
        "--key",
        "My-New-Broadcast",
        "--steps",
        "email",
        "--force",
      ])
      .catch((error) =>
        expect(error.message).to.match(/^Invalid broadcast key/),
      )
      .it("throws an error");
  });

  describe("if invoked inside another broadcast directory", () => {
    beforeEach(() => {
      const broadcastDir = path.resolve(sandboxDir, "existing-broadcast");
      fs.ensureDirSync(broadcastDir);
      fs.outputJsonSync(path.resolve(broadcastDir, BROADCAST_JSON), {
        key: "existing-broadcast",
        name: "Existing",
        steps: [],
      });
      process.chdir(broadcastDir);
    });

    setupWithStub()
      .command([
        "broadcast new",
        "--name",
        "My New Broadcast",
        "--key",
        "my-new-broadcast",
        "--steps",
        "email",
        "--force",
      ])
      .catch(
        "Cannot create a new broadcast inside an existing broadcast directory",
      )
      .it("throws an error");
  });

  describe("given a broadcast key for an existing directory with --force", () => {
    beforeEach(() => {
      const broadcastDir = path.resolve(sandboxDir, "my-broadcast");
      fs.ensureDirSync(broadcastDir);
      fs.outputJsonSync(path.resolve(broadcastDir, BROADCAST_JSON), {
        key: "my-broadcast",
        name: "Existing Broadcast",
        steps: [],
      });
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command([
        "broadcast new",
        "--name",
        "Overwrite",
        "--key",
        "my-broadcast",
        "--steps",
        "email",
        "--force",
      ])
      .it("overwrites the existing broadcast directory", () => {
        const content = fs.readJsonSync(
          path.resolve(sandboxDir, "my-broadcast", BROADCAST_JSON),
        );
        expect(content.key).to.equal("my-broadcast");
      });
  });
});
