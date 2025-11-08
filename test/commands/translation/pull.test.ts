import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { TranslationData } from "@/lib/marshal/translation";

const currCwd = process.cwd();

const setupWithListTranslationsStub = (
  ...manyTranslationsAttrs: Partial<TranslationData>[]
) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "whoami", (stub) =>
      stub.resolves(factory.resp({ data: factory.whoami() })),
    )
    .stub(KnockApiV1.prototype, "listTranslations", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            entries: manyTranslationsAttrs.map((attrs) =>
              factory.translation(attrs),
            ),
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

const setupWithGetTranslationStub = (attrs: Partial<TranslationData>) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "whoami", (stub) =>
      stub.resolves(factory.resp({ data: factory.whoami() })),
    )
    .stub(KnockApiV1.prototype, "getTranslation", (stub) =>
      stub.resolves(factory.resp({ data: factory.translation(attrs) })),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

describe("commands/translation/pull", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given neither --all flag nor a translation ref arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: factory.whoami() })),
      )
      .stdout()
      .command(["translation pull"])
      .catch((error) =>
        expect(error.message).to.match(
          /At least one of translation ref arg or --all flag must be given/,
        ),
      )
      .it("throws an error");
  });

  describe("given a --all flag only", () => {
    setupWithListTranslationsStub(
      { locale_code: "en" },
      { locale_code: "es-MX" },
    )
      .stdout()
      .command([
        "translation pull",
        "--all",
        "--translations-dir",
        "./translations",
      ])
      .it("calls apiV1 listTranslations", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listTranslations as any,
          sinon.match(({ flags }) =>
            isEqual(flags, {
              all: true,
              "translations-dir": {
                abspath: path.resolve(sandboxDir, "translations"),
                exists: false,
              },
              "service-token": "valid-token",
              environment: "development",
              limit: 100,
              format: "json",
            }),
          ),
        );
      });

    setupWithListTranslationsStub(
      { locale_code: "en" },
      { locale_code: "es-MX", namespace: "admin" },
    )
      .stdout()
      .command([
        "translation pull",
        "--all",
        "--translations-dir",
        "./translations",
      ])
      .it(
        "writes a translations dir to the file system organized by locale dirs",
        () => {
          const path1 = path.resolve(
            sandboxDir,
            "translations",
            "en",
            "en.json",
          );
          expect(fs.pathExistsSync(path1)).to.equal(true);

          const path2 = path.resolve(
            sandboxDir,
            "translations",
            "es-MX",
            "admin.es-MX.json",
          );
          expect(fs.pathExistsSync(path2)).to.equal(true);
        },
      );
  });

  describe("given a translation ref arg only", () => {
    setupWithGetTranslationStub({ locale_code: "es-MX", namespace: "hello" })
      .stdout()
      .command(["translation pull", "hello.es-MX"])
      .it("calls apiV1 getTranslation", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getTranslation as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                translationRef: "hello.es-MX",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                format: "json",
              }),
          ),
          sinon.match((translation) =>
            isEqual(translation, {
              ref: "hello.es-MX",
              localeCode: "es-MX",
              namespace: "hello",
              abspath: path.resolve(sandboxDir, "es-MX", "hello.es-MX.json"),
              exists: false,
            }),
          ),
        );
      });

    setupWithGetTranslationStub({ locale_code: "es-MX", namespace: "hello" })
      .stdout()
      .command(["translation pull", "hello.es-MX"])
      .it(
        "writes a locale dir to the file system with the target translation file",
        () => {
          const abspath = path.resolve(sandboxDir, "es-MX", "hello.es-MX.json");
          expect(fs.pathExistsSync(abspath)).to.equal(true);
        },
      );
  });

  describe("given a branch flag", () => {
    setupWithGetTranslationStub({ locale_code: "es-MX", namespace: "hello" })
      .stdout()
      .command([
        "translation pull",
        "hello.es-MX",
        "--branch",
        "my-feature-branch-123",
      ])
      .it("calls apiV1 getTranslation with expected params", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getTranslation as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                translationRef: "hello.es-MX",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                branch: "my-feature-branch-123",
                format: "json",
              }),
          ),
          sinon.match((translation) =>
            isEqual(translation, {
              ref: "hello.es-MX",
              localeCode: "es-MX",
              namespace: "hello",
              abspath: path.resolve(sandboxDir, "es-MX", "hello.es-MX.json"),
              exists: false,
            }),
          ),
        );
      });
  });

  describe("given a --all flag with a namespaced translation ref", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: factory.whoami() })),
      )
      .stdout()
      .command(["translation pull", "admin.en", "--all"])
      .catch((error) =>
        expect(error.message).to.match(
          /Cannot use --all with a namespaced translation `admin.en`/,
        ),
      )
      .it("throws an error");
  });

  describe("given a --all flag with a namespace-less translation ref", () => {
    setupWithListTranslationsStub(
      { locale_code: "en" },
      { locale_code: "en", namespace: "admin" },
    )
      .stdout()
      .command(["translation pull", "--all", "en"])
      .it("calls apiV1 listTranslations with filters", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listTranslations as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                translationRef: "en",
              }) &&
              isEqual(flags, {
                all: true,
                "service-token": "valid-token",
                environment: "development",
                limit: 100,
                format: "json",
              }),
          ),
          sinon.match((filters) =>
            isEqual(filters, {
              localeCode: "en",
            }),
          ),
        );
      });

    setupWithListTranslationsStub(
      { locale_code: "en" },
      { locale_code: "en", namespace: "admin" },
    )
      .stdout()
      .command(["translation pull", "--all", "en"])
      .it(
        "writes a locale dir to the file system with all translation files",
        () => {
          const path1 = path.resolve(sandboxDir, "en", "en.json");
          expect(fs.pathExistsSync(path1)).to.equal(true);

          const path2 = path.resolve(sandboxDir, "en", "admin.en.json");
          expect(fs.pathExistsSync(path2)).to.equal(true);
        },
      );

    setupWithListTranslationsStub(
      { locale_code: "nl-NL", namespace: "assets" },
      { locale_code: "nl-NL", namespace: "schedules" },
    )
      .stdout()
      .command([
        "translation pull",
        "--all",
        "nl-NL",
        "--translations-dir",
        "./knock/translation",
      ])
      .it(
        "respects --translations-dir flag when pulling all translations for a locale",
        () => {
          const path1 = path.resolve(
            sandboxDir,
            "knock/translation",
            "nl-NL",
            "assets.nl-NL.json",
          );
          expect(fs.pathExistsSync(path1)).to.equal(true);

          const path2 = path.resolve(
            sandboxDir,
            "knock/translation",
            "nl-NL",
            "schedules.nl-NL.json",
          );
          expect(fs.pathExistsSync(path2)).to.equal(true);

          // Verify it doesn't create files in the default location
          const wrongPath = path.resolve(sandboxDir, "nl-NL");
          expect(fs.pathExistsSync(wrongPath)).to.equal(false);
        },
      );
  });

  describe("when translations feature is disabled for the account", () => {
    afterEach(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
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
      .command(["translation pull", "en"])
      .exit(0)
      .it(
        "logs a message about translations not being enabled and exits gracefully",
        (ctx) => {
          expect(ctx.stdout).to.contain(
            "Translations are not enabled for your account. Please contact support to enable the translations feature.",
          );
        },
      );
  });

  describe("with knock.json config", () => {
    setupWithListTranslationsStub(
      { locale_code: "en" },
      { locale_code: "es-MX" },
    )
      .stdout()
      .do(() => {
        // Create knock.json with knockDir config
        const configPath = path.resolve(sandboxDir, "knock.json");
        fs.writeJsonSync(configPath, { knockDir: "my-resources" });

        // Create the translations directory
        fs.ensureDirSync(
          path.resolve(sandboxDir, "my-resources", "translations"),
        );
      })
      .command(["translation pull", "--all", "--force"])
      .it("uses translations directory from knock.json knockDir", () => {
        // Verify resources were pulled to the config directory
        const translationPath = path.resolve(
          sandboxDir,
          "my-resources",
          "translations",
          "en",
          "en.json",
        );
        expect(fs.pathExistsSync(translationPath)).to.equal(true);
      });
  });

  describe("with knock.json and --translations-dir flag", () => {
    setupWithListTranslationsStub(
      { locale_code: "en" },
      { locale_code: "es-MX" },
    )
      .stdout()
      .do(() => {
        // Create knock.json with knockDir config
        const configPath = path.resolve(sandboxDir, "knock.json");
        fs.writeJsonSync(configPath, { knockDir: "config-resources" });
      })
      .command([
        "translation pull",
        "--all",
        "--translations-dir",
        "flag-translations",
        "--force",
      ])
      .it("flag takes precedence over knock.json", () => {
        // Verify it used the flag value, not the config
        const flagPath = path.resolve(
          sandboxDir,
          "flag-translations",
          "en",
          "en.json",
        );
        expect(fs.pathExistsSync(flagPath)).to.equal(true);

        // Verify config-resources was NOT used
        const configPath = path.resolve(
          sandboxDir,
          "config-resources",
          "translations",
          "en",
          "en.json",
        );
        expect(fs.pathExistsSync(configPath)).to.equal(false);
      });
  });
});
