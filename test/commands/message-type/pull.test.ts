import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { MessageTypeData } from "@/lib/marshal/message-type";

const currCwd = process.cwd();

const setupWithGetMessageTypeStub = (messageTypeAttrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getMessageType", (stub) =>
      stub.resolves(
        factory.resp({
          data: factory.messageType(messageTypeAttrs),
        }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

const setupWithListMessageTypesStub = (
  ...manyMessageTypesAttrs: Partial<MessageTypeData>[]
) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listMessageTypes", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            entries: manyMessageTypesAttrs.map((attrs) =>
              factory.messageType(attrs),
            ),
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

describe("commands/message-type/pull", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a message type key arg", () => {
    setupWithGetMessageTypeStub({ key: "card" })
      .stdout()
      .command(["message-type pull", "card"])
      .it("calls apiV1 getMessageType with an annotate param", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getMessageType as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                messageTypeKey: "card",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                annotate: true,
              }),
          ),
        );
      });

    setupWithGetMessageTypeStub({ key: "modal" })
      .stdout()
      .command(["message-type pull", "modal"])
      .it("writes a message type dir to the file system", () => {
        const exists = fs.pathExistsSync(
          path.resolve(sandboxDir, "modal", "message_type.json"),
        );

        expect(exists).to.equal(true);
      });
  });

  describe("given a branch flag", () => {
    setupWithGetMessageTypeStub({ key: "modal" })
      .stdout()
      .command([
        "message-type pull",
        "modal",
        "--branch",
        "my-feature-branch-123",
      ])
      .it("calls apiV1 getMessageType with expected params", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getMessageType as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                messageTypeKey: "modal",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                branch: "my-feature-branch-123",
                annotate: true,
              }),
          ),
        );
      });
  });

  describe("given a --all flag", () => {
    setupWithListMessageTypesStub({ key: "card" }, { key: "banner" })
      .stdout()
      .command([
        "message-type pull",
        "--all",
        "--message-types-dir",
        "./message_types",
      ])
      .it("calls apiV1 listMessageTypes with an annotate param", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listMessageTypes as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                all: true,
                "message-types-dir": {
                  abspath: path.resolve(sandboxDir, "message_types"),
                  exists: false,
                },
                "service-token": "valid-token",
                environment: "development",
                annotate: true,
                limit: 100,
              }),
          ),
        );
      });

    setupWithListMessageTypesStub(
      { key: "card" },
      { key: "banner" },
      { key: "modal" },
    )
      .stdout()
      .command([
        "message-type pull",
        "--all",
        "--message-types-dir",
        "./message_types",
      ])
      .it(
        "writes a message types dir to the file system, with individual message type dirs inside",
        () => {
          const path1 = path.resolve(
            sandboxDir,
            "message_types",
            "card",
            "message_type.json",
          );
          expect(fs.pathExistsSync(path1)).to.equal(true);

          const path2 = path.resolve(
            sandboxDir,
            "message_types",
            "banner",
            "message_type.json",
          );
          expect(fs.pathExistsSync(path2)).to.equal(true);

          const path3 = path.resolve(
            sandboxDir,
            "message_types",
            "modal",
            "message_type.json",
          );
          expect(fs.pathExistsSync(path3)).to.equal(true);
        },
      );
  });

  describe("given both a message type key arg and a --all flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["message-type pull", "card", "--all"])
      .catch(
        "messageTypeKey arg `card` cannot also be provided when using --all",
      )
      .it("throws an error");
  });

  describe("with knock.json config", () => {
    setupWithListMessageTypesStub({ key: "card" })
      .stdout()
      .do(() => {
        // Create knock.json with knockDir config
        const configPath = path.resolve(sandboxDir, "knock.json");
        fs.writeJsonSync(configPath, { knockDir: "my-resources" });

        // Create the message types directory
        fs.ensureDirSync(
          path.resolve(sandboxDir, "my-resources", "message-types"),
        );
      })
      .command(["message-type pull", "--all", "--force"])
      .it("uses message types directory from knock.json knockDir", () => {
        // Verify resources were pulled to the config directory
        const messageTypePath = path.resolve(
          sandboxDir,
          "my-resources",
          "message-types",
          "card",
        );
        expect(fs.pathExistsSync(messageTypePath)).to.equal(true);
      });
  });

  describe("with knock.json and --message-types-dir flag", () => {
    setupWithListMessageTypesStub({ key: "card" })
      .stdout()
      .do(() => {
        // Create knock.json with knockDir config
        const configPath = path.resolve(sandboxDir, "knock.json");
        fs.writeJsonSync(configPath, { knockDir: "config-resources" });
      })
      .command([
        "message-type pull",
        "--all",
        "--message-types-dir",
        "flag-message-types",
        "--force",
      ])
      .it("flag takes precedence over knock.json", () => {
        // Verify it used the flag value, not the config
        const flagPath = path.resolve(sandboxDir, "flag-message-types", "card");
        expect(fs.pathExistsSync(flagPath)).to.equal(true);

        // Verify config-resources was NOT used
        const configPath = path.resolve(
          sandboxDir,
          "config-resources",
          "message-types",
          "card",
        );
        expect(fs.pathExistsSync(configPath)).to.equal(false);
      });
  });
});
