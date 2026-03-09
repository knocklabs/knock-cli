import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { AUDIENCE_JSON } from "@/lib/marshal/audience";

const audienceJsonFile = "default/audience.json";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "validateAudience", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/audience/validate (a single audience)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given an audience directory exists, for the audience key", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, audienceJsonFile);
      fs.outputJsonSync(abspath, { name: "Default", type: "static" });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience validate", "default"])
      .it("calls apiV1 validateAudience with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.validateAudience as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { audienceKey: "default" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
              }),
          ),
          sinon.match((audience) =>
            isEqual(audience, {
              key: "default",
              name: "Default",
              type: "static",
            }),
          ),
        );
      });

    describe("given a branch flag", () => {
      setupWithStub()
        .stdout()
        .command([
          "audience validate",
          "default",
          "--branch",
          "my-feature-branch-123",
        ])
        .it("calls apiV1 validateAudience with expected params", () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.validateAudience as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, { audienceKey: "default" }) &&
                isEqual(flags, {
                  "service-token": "valid-token",
                  environment: "development",
                  branch: "my-feature-branch-123",
                }),
            ),
            sinon.match((audience) =>
              isEqual(audience, {
                key: "default",
                name: "Default",
                type: "static",
              }),
            ),
          );
        });
    });
  });

  describe("given an audience.json file, with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, audienceJsonFile);
      fs.outputFileSync(abspath, '{"name":"Default",}');

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience validate", "default"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given an audience.json file, with data errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, audienceJsonFile);
      fs.outputJsonSync(abspath, { name: 123 });

      process.chdir(sandboxDir);
    });

    setupWithStub({
      status: 422,
      data: { errors: [{ field: "name", message: "must be a string" }] },
    })
      .stdout()
      .command(["audience validate", "default"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError.*"name" must be a string/,
        ),
      )
      .it("throws an error");
  });

  describe("given a nonexistent audience directory, for the audience key", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience validate", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(/^Cannot locate an audience directory/),
      )
      .it("throws an error");
  });

  describe("given no audience key arg nor --all flag", () => {
    setupWithStub()
      .stdout()
      .command(["audience validate"])
      .exit(2)
      .it("exits with status 2");
  });
});

describe("commands/audience/validate (all audiences)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a nonexistent audiences index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience validate", "--all", "--audiences-dir", "audiences"])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate audience directories in/),
      )
      .it("throws an error");
  });

  describe("given an audience index directory, without any audiences", () => {
    beforeEach(() => {
      const indexDirPath = path.resolve(sandboxDir, "audiences");
      fs.ensureDirSync(indexDirPath);

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience validate", "--all", "--audiences-dir", "audiences"])
      .catch((error) =>
        expect(error.message).to.match(/No audience directories found in/),
      )
      .it("throws an error");
  });

  describe("given an audiences index directory with 2 valid audiences", () => {
    const indexDirPath = path.resolve(sandboxDir, "audiences");

    beforeEach(() => {
      const vipAudienceJson = path.resolve(
        indexDirPath,
        "vip-users",
        AUDIENCE_JSON,
      );
      fs.outputJsonSync(vipAudienceJson, { name: "VIP Users", type: "static" });

      const betaAudienceJson = path.resolve(
        indexDirPath,
        "beta-testers",
        AUDIENCE_JSON,
      );
      fs.outputJsonSync(betaAudienceJson, {
        name: "Beta Testers",
        type: "dynamic",
      });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["audience validate", "--all", "--audiences-dir", "audiences"])
      .it("calls apiV1 validateAudience with expected props twice", () => {
        const stub = KnockApiV1.prototype.validateAudience as any;
        sinon.assert.calledTwice(stub);
      });
  });
});
