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

  describe("given a --all flag", () => {
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
              "api-origin": undefined,
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
        "writes a translations dir to the file system, with individual locale dirs inside that hold the translation json files",
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
});
