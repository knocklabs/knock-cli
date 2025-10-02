import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { GUIDE_JSON } from "@/lib/marshal/guide";

const guideJsonFile = "welcome-guide/guide.json";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "validateGuide", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/guide/validate (a single guide)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a guide directory exists, for the guide key", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, guideJsonFile);
      fs.outputJsonSync(abspath, { name: "Welcome Guide" });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["guide validate", "welcome-guide"])
      .it("calls apiV1 validateGuide with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.validateGuide as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { guideKey: "welcome-guide" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
              }),
          ),
          sinon.match((guide) =>
            isEqual(guide, {
              key: "welcome-guide",
              name: "Welcome Guide",
            }),
          ),
        );
      });

    describe("given a branch flag", () => {
      setupWithStub()
        .stdout()
        .command([
          "guide validate",
          "welcome-guide",
          "--branch",
          "my-feature-branch-123",
        ])
        .it("calls apiV1 validateGuide with expected params", () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.validateGuide as any,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, { guideKey: "welcome-guide" }) &&
                isEqual(flags, {
                  "service-token": "valid-token",
                  environment: "development",
                  branch: "my-feature-branch-123",
                }),
            ),
            sinon.match((guide) =>
              isEqual(guide, {
                key: "welcome-guide",
                name: "Welcome Guide",
              }),
            ),
          );
        });
    });
  });

  describe("given a guide.json file, with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, guideJsonFile);
      fs.outputFileSync(abspath, '{"name":"Welcome Guide",}');

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["guide validate", "welcome-guide"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given a guide.json file, with data errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, guideJsonFile);
      fs.outputJsonSync(abspath, { name: 10 });

      process.chdir(sandboxDir);
    });

    setupWithStub({
      status: 422,
      data: { errors: [{ field: "name", message: "must be a string" }] },
    })
      .stdout()
      .command(["guide validate", "welcome-guide"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError.*"name" must be a string/,
        ),
      )
      .it("throws an error");
  });

  describe("given a nonexistent guide directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["guide validate", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(/^Cannot locate a guide directory/),
      )
      .it("throws an error");
  });

  describe("given no guide key arg nor --all flag", () => {
    setupWithStub()
      .stdout()
      .command(["guide validate"])
      .exit(2)
      .it("exits with status 2");
  });
});

describe("commands/guide/validate (all guides)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a nonexistent guides index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["guide validate", "--all", "--guides-dir", "guides"])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate guide directories in/),
      )
      .it("throws an error");
  });

  describe("given a guides index directory, without any guides", () => {
    beforeEach(() => {
      const indexDirPath = path.resolve(sandboxDir, "guides");
      fs.ensureDirSync(indexDirPath);

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["guide validate", "--all", "--guides-dir", "guides"])
      .catch((error) =>
        expect(error.message).to.match(/No guide directories found in/),
      )
      .it("throws an error");
  });

  describe("given a guides index directory with 2 valid guides", () => {
    const indexDirPath = path.resolve(sandboxDir, "guides");

    beforeEach(() => {
      const fooGuideJson = path.resolve(indexDirPath, "foo", GUIDE_JSON);
      fs.outputJsonSync(fooGuideJson, { name: "Foo Guide" });

      const barGuideJson = path.resolve(indexDirPath, "bar", GUIDE_JSON);
      fs.outputJsonSync(barGuideJson, { name: "Bar Guide" });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["guide validate", "--all", "--guides-dir", "guides"])
      .it("calls apiV1 validateGuide with expected props twice", () => {
        const stub = KnockApiV1.prototype.validateGuide as any;
        sinon.assert.calledTwice(stub);

        const expectedArgs = {};
        const expectedFlags = {
          "service-token": "valid-token",
          environment: "development",
          all: true,
          "guides-dir": {
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
          sinon.match((guide) =>
            isEqual(guide, { key: "bar", name: "Bar Guide" }),
          ),
        );

        sinon.assert.calledWith(
          stub.secondCall,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
          ),
          sinon.match((guide) =>
            isEqual(guide, { key: "foo", name: "Foo Guide" }),
          ),
        );
      });
  });

  describe("given a guides index directory, with 1 valid and 1 invalid guides", () => {
    const indexDirPath = path.resolve(sandboxDir, "guides");

    beforeEach(() => {
      const fooGuideJson = path.resolve(indexDirPath, "foo", GUIDE_JSON);
      fs.outputJsonSync(fooGuideJson, { name: "Foo Guide" });

      const barGuideJson = path.resolve(indexDirPath, "bar", GUIDE_JSON);
      fs.outputJsonSync(barGuideJson, { name: 6 });

      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "validateGuide", (stub) =>
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
      .command(["guide validate", "--all", "--guides-dir", "guides"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError: data at "name" must be a string/,
        ),
      )
      .it("calls apiV1 validateGuide twice, then errors", () => {
        const stub = KnockApiV1.prototype.validateGuide as any;
        sinon.assert.calledTwice(stub);
      });
  });
});
