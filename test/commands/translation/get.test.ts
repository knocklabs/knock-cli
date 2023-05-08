import { test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/translation/get", () => {
  describe("given no translation ref arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["translation get"])
      .exit(2)
      .it("exists with status 2");
  });

  describe("given a translation ref arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(
        KnockApiV1.prototype,
        "getTranslation",
        sinon.stub().resolves(
          factory.resp({
            data: factory.translation(),
          }),
        ),
      )
      .stdout()
      .command(["translation get", "admin.en"])
      .it("calls apiV1 getTranslation with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getTranslation as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                translationRef: "admin.en",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "api-origin": undefined,
                environment: "development",
              }),
          ),
          sinon.match((translation) =>
            isEqual(translation, {
              localeCode: "en",
              namespace: "admin",
            }),
          ),
        );
      });
  });

  describe("given a translation ref arg, and flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(
        KnockApiV1.prototype,
        "getTranslation",
        sinon.stub().resolves(
          factory.resp({
            data: factory.translation(),
          }),
        ),
      )
      .stdout()
      .command([
        "translation get",
        "es",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
      ])
      .it("calls apiV1 getTranslation with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getTranslation as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                translationRef: "es",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "api-origin": undefined,
                "hide-uncommitted-changes": true,
                environment: "staging",
              }),
          ),
          sinon.match((translation) =>
            isEqual(translation, {
              localeCode: "es",
              namespace: undefined,
            }),
          ),
        );
      });
  });

  describe("given a translation ref that does not exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(
        KnockApiV1.prototype,
        "getTranslation",
        sinon.stub().resolves(
          factory.resp({
            status: 404,
            statusText: "Not found",
            data: {
              code: "resource_missing",
              message: "The resource you requested does not exist",
              status: 404,
              type: "api_error",
            },
          }),
        ),
      )
      .stdout()
      .command(["translation get", "en"])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });
});
