import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "validateTranslation", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/translation/validate (a single translation)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a valid en translation file", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, "en", "en.json");
      fs.outputJsonSync(abspath, { hello: "Heyyyy" });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["translation validate", "en"])
      .it("calls apiV1 validateTranslation with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.validateTranslation as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { translationRef: "en" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
              }),
          ),
          sinon.match((translation) =>
            isEqual(translation, {
              locale_code: "en",
              namespace: undefined,
              content: '{"hello":"Heyyyy"}',
              format: "json",
            }),
          ),
        );
      });
  });

  describe("given a valid admin.en translation file", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, "en", "admin.en.json");
      fs.outputJsonSync(abspath, { hello: "Heyyyy" });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["translation validate", "admin.en"])
      .it("calls apiV1 validateTranslation with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.validateTranslation as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { translationRef: "admin.en" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
              }),
          ),
          sinon.match((translation) =>
            isEqual(translation, {
              locale_code: "en",
              namespace: "admin",
              content: '{"hello":"Heyyyy"}',
              format: "json",
            }),
          ),
        );
      });
  });

  describe("given a translation file, with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(sandboxDir, "en", "en.json");
      fs.outputFileSync(abspath, '{"hello":"Heyyyy",}');

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["translation validate", "en"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given a nonexistent translation file, for the translation ref", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["translation validate", "admin.en"])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate a translation file/),
      )
      .it("throws an error");
  });

  describe("given no translation ref arg nor --all flag", () => {
    setupWithStub()
      .stdout()
      .command(["translation validate"])
      .exit(2)
      .it("exists with status 2");
  });
});

describe("commands/translation/validate (all translations)", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a nonexistent translations index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command([
        "translation validate",
        "--all",
        "--translations-dir",
        "translations",
      ])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate translation files/),
      )
      .it("throws an error");
  });

  describe("given a translations index directory, without any translation files", () => {
    beforeEach(() => {
      const indexDirPath = path.resolve(sandboxDir, "translations");
      fs.ensureDirSync(indexDirPath);

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command([
        "translation validate",
        "--all",
        "--translations-dir",
        "translations",
      ])
      .catch((error) =>
        expect(error.message).to.match(/No translation files found in/),
      )
      .it("throws an error");
  });

  describe("given a translations index directory with multiple translation files", () => {
    const indexDirPath = path.resolve(sandboxDir, "translations");

    beforeEach(() => {
      fs.outputJsonSync(path.resolve(indexDirPath, "en", "en.json"), {
        hello: "Heyyyy",
      });
      fs.outputJsonSync(path.resolve(indexDirPath, "en", "admin.en.json"), {
        admin: "foo",
      });
      // Invalid translation file in a valid locale directory.
      fs.outputJsonSync(path.resolve(indexDirPath, "en", "yolo.json"), {
        yolo: "foo",
      });

      fs.outputJsonSync(path.resolve(indexDirPath, "es", "tasks.es.json"), {
        hello: "Hola",
      });

      // Invalid locale directory.
      fs.outputJsonSync(path.resolve(indexDirPath, "blah", "blah.json"), {
        blah: "Blah",
      });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command([
        "translation validate",
        "--all",
        "--translations-dir",
        "translations",
      ])
      .it(
        "calls apiV1 validateTranslation with expected props for correct number of times",
        () => {
          const stub = KnockApiV1.prototype.validateTranslation as any;
          sinon.assert.calledThrice(stub);

          const expectedArgs = {};
          const expectedFlags = {
            "service-token": "valid-token",
            environment: "development",
            all: true,
            "translations-dir": {
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
            sinon.match((translation) =>
              isEqual(translation, {
                locale_code: "en",
                namespace: "admin",
                content: '{"admin":"foo"}',
                format: "json",
              }),
            ),
          );

          // Second validate call
          sinon.assert.calledWith(
            stub.secondCall,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
            ),
            sinon.match((translation) =>
              isEqual(translation, {
                locale_code: "en",
                namespace: undefined,
                content: '{"hello":"Heyyyy"}',
                format: "json",
              }),
            ),
          );

          // Third validate call
          sinon.assert.calledWith(
            stub.thirdCall,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, expectedArgs) && isEqual(flags, expectedFlags),
            ),
            sinon.match((translation) =>
              isEqual(translation, {
                locale_code: "es",
                namespace: "tasks",
                content: '{"hello":"Hola"}',
                format: "json",
              }),
            ),
          );
        },
      );
  });
});
