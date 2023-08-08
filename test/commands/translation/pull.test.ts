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
    .stub(
      KnockApiV1.prototype,
      "listTranslations",
      sinon.stub().resolves(
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
    .stub(
      enquirer.prototype,
      "prompt",
      sinon.stub().onFirstCall().resolves({ input: "y" }),
    );

const setupWithGetTranslationStub = (attrs: Partial<TranslationData>) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "getTranslation",
      sinon.stub().resolves(factory.resp({ data: factory.translation(attrs) })),
    )
    .stub(
      enquirer.prototype,
      "prompt",
      sinon.stub().onFirstCall().resolves({ input: "y" }),
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

  describe("given a --all flag with a namespaced translation ref", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
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
  });
});
