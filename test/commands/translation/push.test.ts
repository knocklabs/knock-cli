import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const setupWithStub = (upsertRespAttrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "validateTranslation",
      sinon.stub().resolves(factory.resp()),
    )
    .stub(
      KnockApiV1.prototype,
      "upsertTranslation",
      sinon.stub().resolves(factory.resp(upsertRespAttrs)),
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
                "api-origin": undefined,
                environment: "development",
                commit: true,
                "commit-message": "this is a commit comment!",
              }),
            ),
            sinon.match({
              content: '{"welcome":"hello!"}',
              locale_code: "en",
              namespace: "admin",
            }),
          );
        },
      );
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
        expect(error.message).to.match(/Cannot locate translation file\(s\)/),
      )
      .it("throws an error");
  });

  describe("given no translation ref arg and no --all", () => {
    setupWithStub()
      .stdout()
      .command(["translation push"])
      .exit(2)
      .it("exists with status 2");
  });
});
