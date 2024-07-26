import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { PARTIAL_JSON } from "@/lib/marshal/partial";

const partialJsonFile = "default/partial.json";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "validatePartial", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/partial/validate (a single partial)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a partial directory exists, for the partial key", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, partialJsonFile);
      fs.outputJsonSync(abspath, { name: "Default" });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["partial validate", "default"])
      .it("calls apiV1 validatePartial with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.validatePartial as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { partialKey: "default" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
              }),
          ),
          sinon.match((partial) =>
            isEqual(partial, {
              key: "default",
              name: "Default",
            }),
          ),
        );
      });
  });

  describe("given a partial.json file, with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, partialJsonFile);
      fs.outputFileSync(abspath, '{"name":"Default",}');

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["partial validate", "default"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given a partial.json file, with data errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, partialJsonFile);
      fs.outputJsonSync(abspath, { name: 123 });

      process.chdir(sandboxDir);
    });

    setupWithStub({
      status: 422,
      data: { errors: [{ field: "name", message: "must be a string" }] },
    })
      .stdout()
      .command(["partial validate", "default"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError.*"name" must be a string/,
        ),
      )
      .it("throws an error");
  });

  describe("given a nonexistent partial directory, for the partial key", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["partial validate", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(/^Cannot locate a partial directory/),
      )
      .it("throws an error");
  });

  describe("given no partial key arg nor --all flag", () => {
    setupWithStub()
      .stdout()
      .command(["partial validate"])
      .exit(2)
      .it("exists with status 2");
  });
});

describe("commands/partial/validate (all partials)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a nonexistent partials index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["partial validate", "--all", "--partials-dir", "partials"])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate partial directories in/),
      )
      .it("throws an error");
  });

  describe("given a partial index directory, without any partials", () => {
    beforeEach(() => {
      const indexDirPath = path.resolve(sandboxDir, "partials");
      fs.ensureDirSync(indexDirPath);

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["partial validate", "--all", "--partials-dir", "partials"])
      .catch((error) =>
        expect(error.message).to.match(/No partial directories found in/),
      )
      .it("throws an error");
  });

  describe("given a partials index directory with 2 valid partials", () => {
    const indexDirPath = path.resolve(sandboxDir, "partials");

    beforeEach(() => {
      const messagesPartialJson = path.resolve(
        indexDirPath,
        "messages",
        PARTIAL_JSON,
      );
      fs.outputJsonSync(messagesPartialJson, { name: "Messages" });

      const transactionalPartialJson = path.resolve(
        indexDirPath,
        "transactional",
        PARTIAL_JSON,
      );
      fs.outputJsonSync(transactionalPartialJson, { name: "Transactional" });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["partial validate", "--all", "--partials-dir", "partials"])
      .it("calls apiV1 validatePartial with expected props twice", () => {
        const stub = KnockApiV1.prototype.validatePartial as any;
        sinon.assert.calledTwice(stub);

        const expectedArgs = {};
        const expectedFlags = {
          "service-token": "valid-token",
          environment: "development",
          all: true,
          "partials-dir": {
            abspath: indexDirPath,
            exists: true,
          },
        };

        // First validate call
        sinon.assert.calledWith(
          stub.firstCall,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
          ),
          sinon.match((partial) =>
            isEqual(partial, { key: "messages", name: "Messages" }),
          ),
        );

        // Second validate call
        sinon.assert.calledWith(
          stub.secondCall,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
          ),
          sinon.match((partial) =>
            isEqual(partial, { key: "transactional", name: "Transactional" }),
          ),
        );
      });
  });

  describe("given a partials index directory, with 1 valid and 1 invalid partials", () => {
    const indexDirPath = path.resolve(sandboxDir, "partials");

    beforeEach(() => {
      const messagesPartialJson = path.resolve(
        indexDirPath,
        "messages",
        PARTIAL_JSON,
      );
      fs.outputJsonSync(messagesPartialJson, { name: "Messages" });

      const transactionalPartialJson = path.resolve(
        indexDirPath,
        "transactional",
        PARTIAL_JSON,
      );
      fs.outputJsonSync(transactionalPartialJson, { name: 1234 });

      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "validatePartial", (stub) =>
        stub
          .onFirstCall()
          .resolves(
            factory.resp({
              status: 422,
              data: {
                errors: [{ field: "name", message: "must be a string" }],
              },
            }),
          )
          .onSecondCall()
          .resolves(factory.resp()),
      )
      .stdout()
      .command(["partial validate", "--all", "--partials-dir", "partials"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError: data at "name" must be a string/,
        ),
      )
      .it("calls apiV1 validatePartial twice, then errors", () => {
        const stub = KnockApiV1.prototype.validatePartial as any;
        sinon.assert.calledTwice(stub);
      });
  });
});
