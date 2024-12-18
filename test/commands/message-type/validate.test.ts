import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { MESSAGE_TYPE_JSON } from "@/lib/marshal/message-type";

const messageTypeJsonFile = "card/message_type.json";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "validateMessageType", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/message-type/validate (a single message type)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a message type directory exists, for the message type key", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, messageTypeJsonFile);
      fs.outputJsonSync(abspath, { name: "Card" });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["message-type validate", "card"])
      .it("calls apiV1 validateMessageType with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.validateMessageType as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { messageTypeKey: "card" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
              }),
          ),
          sinon.match((messageType) =>
            isEqual(messageType, {
              key: "card",
              name: "Card",
            }),
          ),
        );
      });
  });

  describe("given a message_type.json file with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, messageTypeJsonFile);
      fs.outputFileSync(abspath, '{"name":"Card",}');

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["message-type validate", "card"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given a message_type.json file with data errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, messageTypeJsonFile);
      fs.outputJsonSync(abspath, { name: 123 });

      process.chdir(sandboxDir);
    });

    setupWithStub({
      status: 422,
      data: { errors: [{ field: "name", message: "must be a string" }] },
    })
      .stdout()
      .command(["message-type validate", "card"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError.*"name" must be a string/,
        ),
      )
      .it("throws an error");
  });

  describe("given a nonexistent message type directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["message-type validate", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(
          /^Cannot locate a message type directory/,
        ),
      )
      .it("throws an error");
  });

  describe("given no message type key arg nor --all flag", () => {
    setupWithStub()
      .stdout()
      .command(["message-type validate"])
      .exit(2)
      .it("exits with status 2");
  });
});

describe("commands/message-type/validate (all message types)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a nonexistent message types index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command([
        "message-type validate",
        "--all",
        "--message-types-dir",
        "message_types",
      ])
      .catch((error) =>
        expect(error.message).to.match(
          /Cannot locate message type directories in/,
        ),
      )
      .it("throws an error");
  });

  describe("given a message types index directory with 2 valid message types", () => {
    const indexDirPath = path.resolve(sandboxDir, "message_types");

    beforeEach(() => {
      const cardMessageTypeJson = path.resolve(
        indexDirPath,
        "card",
        MESSAGE_TYPE_JSON,
      );
      fs.outputJsonSync(cardMessageTypeJson, {
        name: "Card",
        description: "Card component",
      });

      const modalMessageTypeJson = path.resolve(
        indexDirPath,
        "modal",
        MESSAGE_TYPE_JSON,
      );
      fs.outputJsonSync(modalMessageTypeJson, {
        name: "Modal",
        description: "Modal component",
      });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command([
        "message-type validate",
        "--all",
        "--message-types-dir",
        "message_types",
      ])
      .it("calls apiV1 validateMessageType with expected props twice", () => {
        const stub = KnockApiV1.prototype.validateMessageType as any;
        sinon.assert.calledTwice(stub);

        const expectedArgs = {};
        const expectedFlags = {
          "service-token": "valid-token",
          environment: "development",
          all: true,
          "message-types-dir": {
            abspath: indexDirPath,
            exists: true,
          },
        };

        sinon.assert.calledWith(
          stub.firstCall,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
          ),
          sinon.match((messageType) =>
            isEqual(messageType, {
              key: "card",
              name: "Card",
              description: "Card component",
            }),
          ),
        );

        sinon.assert.calledWith(
          stub.secondCall,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
          ),
          sinon.match((messageType) =>
            isEqual(messageType, {
              key: "modal",
              name: "Modal",
              description: "Modal component",
            }),
          ),
        );
      });
  });

  describe("given a message types directory with 1 valid and 1 invalid message type", () => {
    const indexDirPath = path.resolve(sandboxDir, "message_types");

    beforeEach(() => {
      const bannerMessageTypeJson = path.resolve(
        indexDirPath,
        "banner",
        MESSAGE_TYPE_JSON,
      );
      fs.outputJsonSync(bannerMessageTypeJson, {
        name: "Banner",
        description: "Banner component",
      });

      const invalidMessageTypeJson = path.resolve(
        indexDirPath,
        "invalid",
        MESSAGE_TYPE_JSON,
      );
      fs.outputJsonSync(invalidMessageTypeJson, { name: 123 });

      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "validateMessageType", (stub) =>
        stub
          .onFirstCall()
          .resolves(factory.resp())
          .onSecondCall()
          .resolves(
            factory.resp({
              status: 422,
              data: {
                errors: [{ field: "name", message: "must be a string" }],
              },
            }),
          ),
      )
      .stdout()
      .command([
        "message-type validate",
        "--all",
        "--message-types-dir",
        "message_types",
      ])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError: data at "name" must be a string/,
        ),
      )
      .it("calls apiV1 validateMessageType twice, then errors", () => {
        const stub = KnockApiV1.prototype.validateMessageType as any;
        sinon.assert.calledTwice(stub);
      });
  });
});
