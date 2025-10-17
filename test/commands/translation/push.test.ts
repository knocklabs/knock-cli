import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import TranslationValidate from "@/commands/translation/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const setupWithStub = (upsertRespAttrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "whoami", (stub) =>
      stub.resolves(factory.resp({ data: factory.whoami() })),
    )
    .stub(TranslationValidate, "validateAll", (stub) => stub.resolves([]))
    .stub(KnockApiV1.prototype, "upsertTranslation", (stub) =>
      stub.resolves(factory.resp(upsertRespAttrs)),
    );

const currCwd = process.cwd();

describe("commands/translation/push", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a translation file exists for locale code and namespace", () => {
    beforeEach(() => {
      const translationsDir = path.resolve(sandboxDir, "translations");
      const abspath = path.resolve(translationsDir, "en", "admin.en.json");
      fs.outputJsonSync(abspath, JSON.parse('{"welcome":"hello!"}'));

      process.chdir(translationsDir);
    });

    setupWithStub()
      .stdout()
      .command(["translation push", "admin.en"])
      .it("calls apiV1 upsertTranslation with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertTranslation as any,
          sinon.match(({ flags }) => {
            return isEqual(flags, {
              "service-token": "valid-token",
              environment: "development",
            });
          }),
          sinon.match({
            content: '{"welcome":"hello!"}',
            locale_code: "en",
            namespace: "admin",
            format: "json",
          }),
        );
      });

    setupWithStub()
      .stdout()
      .command([
        "translation push",
        "admin.en",
        "--commit",
        "-m",
        "this is a commit comment!",
      ])
      .it(
        "calls apiV1 upsertTranslation with commit flags, if provided",
        () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.upsertTranslation as any,
            sinon.match(({ flags }) =>
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                commit: true,
                "commit-message": "this is a commit comment!",
              }),
            ),
            sinon.match({
              content: '{"welcome":"hello!"}',
              locale_code: "en",
              namespace: "admin",
              format: "json",
            }),
          );
        },
      );

    describe("given a branch flag", () => {
      setupWithStub()
        .stdout()
        .command([
          "translation push",
          "admin.en",
          "--branch",
          "my-feature-branch-123",
        ])
        .it("calls apiV1 upsertTranslation with expected params", () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.upsertTranslation as any,
            sinon.match(({ flags }) => {
              return isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                branch: "my-feature-branch-123",
              });
            }),
            sinon.match({
              content: '{"welcome":"hello!"}',
              locale_code: "en",
              namespace: "admin",
              format: "json",
            }),
          );
        });
    });
  });

  describe("given a translation file, with syntax errors", () => {
    beforeEach(() => {
      const translationsDir = path.resolve(sandboxDir, "translations");
      const abspath = path.resolve(translationsDir, "en", "admin.en.json");
      fs.outputFileSync(abspath, '{"name":"New comment",}');

      process.chdir(translationsDir);
    });

    setupWithStub()
      .stdout()
      .command(["translation push", "admin.en"])
      .catch((error) => expect(error.message).to.match(/JsonSyntaxError/))
      .it("throws an error");
  });

  describe("given a translation file, with data errors", () => {
    beforeEach(() => {
      const translationsDir = path.resolve(sandboxDir, "translations");
      const abspath = path.resolve(translationsDir, "en", "admin.en.json");
      fs.outputJsonSync(abspath, { name: 10 });

      process.chdir(translationsDir);
    });

    setupWithStub({
      status: 422,
      data: { errors: [{ field: "name", message: "must be a string" }] },
    })
      .stdout()
      .command(["translation push", "admin.en"])
      .catch((error) =>
        expect(error.message).to.match(
          /JsonDataError.*"name" must be a string/,
        ),
      )
      .it("throws an error");
  });

  describe("given a nonexistent translation file, for the translation ref", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["translation push", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate a translation file/),
      )
      .it("throws an error");
  });

  describe("given no translation ref arg and no --all", () => {
    setupWithStub()
      .stdout()
      .command(["translation push"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given --all and a nonexistent translations index directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command([
        "translation push",
        "--all",
        "--translations-dir",
        "translations",
      ])
      .catch((error) =>
        expect(error.message).to.match(/Cannot locate translation files/),
      )
      .it("throws an error");
  });

  describe("given --all and a translations index directory, without any translation files", () => {
    beforeEach(() => {
      const indexDirPath = path.resolve(sandboxDir, "translations");
      fs.ensureDirSync(indexDirPath);

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command([
        "translation push",
        "--all",
        "--translations-dir",
        "translations",
      ])
      .catch((error) =>
        expect(error.message).to.match(/No translation files found in/),
      )
      .it("throws an error");
  });

  describe("given --all and a translations index directory with multiple translation files", () => {
    const indexDirPath = path.resolve(sandboxDir, "translations");

    beforeEach(() => {
      fs.outputJsonSync(path.resolve(indexDirPath, "en", "en.json"), {
        hello: "Heyyyy",
      });
      fs.outputJsonSync(path.resolve(indexDirPath, "en", "admin.en.json"), {
        admin: "foo",
      });
      fs.outputJsonSync(path.resolve(indexDirPath, "es", "tasks.es.json"), {
        hello: "Hola",
      });

      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command([
        "translation push",
        "--all",
        "--translations-dir",
        "translations",
      ])
      .it(
        "calls apiV1 upsertTranslation with expected props for correct number of times",
        () => {
          // Validate all first
          const stub1 = TranslationValidate.validateAll as any;
          sinon.assert.calledOnce(stub1);

          const stub2 = KnockApiV1.prototype.upsertTranslation as any;
          sinon.assert.calledThrice(stub2);

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

          // First push call
          sinon.assert.calledWith(
            stub2.firstCall,
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

          // Second push call
          sinon.assert.calledWith(
            stub2.secondCall,
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

          // Third push call
          sinon.assert.calledWith(
            stub2.thirdCall,
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

  describe("given a po translation file exists for locale code and namespace", () => {
    beforeEach(() => {
      const translationsDir = path.resolve(sandboxDir, "translations");
      const abspath = path.resolve(translationsDir, "en", "admin.en.po");
      fs.outputFileSync(
        abspath,
        `msgid ""\nmsgstr ""\n"Project-Id-Version: "\n"PO-Revision-Date: "\n"Language: en"\n"Content-Type: text/plain; charset=UTF-8"\n"Content-Transfer-Encoding: 8bit"\n"Plural-Forms: nplurals=2; plural=(n != 1);"\nmsgid "Primary"\nmsgstr "Primary"`,
      );

      process.chdir(translationsDir);
    });

    setupWithStub()
      .stdout()
      .command(["translation push", "admin.en"])
      .it("calls apiV1 upsertTranslation with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertTranslation as any,
          sinon.match(({ flags }) => {
            return isEqual(flags, {
              "service-token": "valid-token",
              environment: "development",
            });
          }),
          sinon.match({
            content: `msgid ""\nmsgstr ""\n"Project-Id-Version: "\n"PO-Revision-Date: "\n"Language: en"\n"Content-Type: text/plain; charset=UTF-8"\n"Content-Transfer-Encoding: 8bit"\n"Plural-Forms: nplurals=2; plural=(n != 1);"\nmsgid "Primary"\nmsgstr "Primary"`,
            locale_code: "en",
            namespace: "admin",
            format: "po",
          }),
        );
      });
  });

  describe("when translations feature is disabled for the account", () => {
    beforeEach(() => {
      const translationsDir = path.resolve(sandboxDir, "translations");
      const abspath = path.resolve(translationsDir, "en", "admin.en.json");
      fs.outputJsonSync(abspath, JSON.parse('{"welcome":"hello!"}'));
      process.chdir(translationsDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.whoami({
              account_features: {
                translations_allowed: false,
              },
            }),
          }),
        ),
      )
      .stdout()
      .command(["translation push", "admin.en"])
      .it(
        "logs a message about translations not being enabled and exits gracefully",
        (ctx) => {
          expect(ctx.stdout).to.contain(
            "Translations are not enabled for your account. Please contact support to enable the translations feature.",
          );
        },
      );
  });
});
