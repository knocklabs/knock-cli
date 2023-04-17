import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { TranslationData } from "@/lib/marshal/translation";

const mockTranslationData: TranslationData = {
  locale_code: "en",
  namespace: "admin",
  content: '{"welcome":"hello!"}',
  created_at: "2022-12-31T12:00:00.000000Z",
  updated_at: "2022-12-31T12:00:00.000000Z",
};

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "upsertTranslation",
      sinon.stub().resolves(factory.resp(attrs)),
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

  describe("given a translation directory exists, for the locale code and namespace", () => {
    beforeEach(() => {
      const abspath = path.resolve(
        sandboxDir,
        `${mockTranslationData.locale_code}/${mockTranslationData.namespace}.${mockTranslationData.locale_code}.json`,
      );
      fs.outputJsonSync(abspath, { welcome: "hello!" });

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { translation: mockTranslationData } })
      .stdout()
      .command(["translation push", "admin.en"])
      .it("calls apiV1 upsertTranslation with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertTranslation as any,
          sinon.match(({ flags }) => {
            return isEqual(flags, {
              "service-token": "valid-token",
              "api-origin": undefined,
              environment: "development",
            });
          }),
          sinon.match({
            content: '{"welcome":"hello!"}',
            locale_code: "en",
            namespace: "admin",
          }),
        );
      });

    setupWithStub({ data: { translation: mockTranslationData } })
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
                "api-origin": undefined,
                environment: "development",
                // Commit flags
                commit: true,
                "commit-message": "this is a commit comment!",
              }),
            ),
            sinon.match({
              content: JSON.stringify({ welcome: "hello!" }),
              locale_code: "en",
              namespace: "admin",
            }),
          );
        },
      );

    setupWithStub({ data: { translation: mockTranslationData } })
      .stdout()
      .command(["translation push", "admin.en"])
      .it(
        "writes the upserted translation data into the content of the translation file",
        () => {
          const abspath = path.resolve(
            sandboxDir,
            `${mockTranslationData.locale_code}/${mockTranslationData.namespace}.${mockTranslationData.locale_code}.json`,
          );
          const translationContent = fs.readJsonSync(abspath);

          expect(translationContent).to.eql({ welcome: "hello!" });
        },
      );
  });

  describe("given a translation file, with syntax errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(
        sandboxDir,
        `${mockTranslationData.locale_code}/${mockTranslationData.namespace}.${mockTranslationData.locale_code}.json`,
      );
      fs.outputFileSync(abspath, '{"name":"New comment",}');

      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { translation: mockTranslationData } })
      .stdout()
      .command(["translation push", "admin.en"])
      .catch((error) =>
        expect(error.message).to.match(/^Found the following errors in/),
      )
      .it("throws an error");
  });

  describe("given a translation file, with data errors", () => {
    beforeEach(() => {
      const abspath = path.resolve(
        sandboxDir,
        `${mockTranslationData.locale_code}/${mockTranslationData.namespace}.${mockTranslationData.locale_code}.json`,
      );
      fs.outputJsonSync(abspath, { name: 10 });

      process.chdir(sandboxDir);
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

  describe("given a nonexistent translation directory, for the translation filename", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub({ data: { translation: mockTranslationData } })
      .stdout()
      .command(["translation push", "does-not-exist"])
      .catch((error) =>
        expect(error.message).to.match(/^Cannot locate a translation file for/),
      )
      .it("throws an error");
  });

  describe("given no translation filename arg", () => {
    setupWithStub({ data: { translation: mockTranslationData } })
      .stdout()
      .command(["translation push"])
      .exit(2)
      .it("exists with status 2");
  });
});
