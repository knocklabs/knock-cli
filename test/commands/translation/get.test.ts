import { expect, test } from "@oclif/test";
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
      .it("exits with status 2");
  });

  describe("given a translation ref arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: factory.whoami() })),
      )
      .stub(KnockApiV1.prototype, "getTranslation", (stub) =>
        stub.resolves(
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
                environment: "development",
                format: "json",
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
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: factory.whoami() })),
      )
      .stub(KnockApiV1.prototype, "getTranslation", (stub) =>
        stub.resolves(
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
                "hide-uncommitted-changes": true,
                environment: "staging",
                format: "json",
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

  describe("given a branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: factory.whoami() })),
      )
      .stub(KnockApiV1.prototype, "getTranslation", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.translation(),
          }),
        ),
      )
      .stdout()
      .command([
        "translation get",
        "admin.en",
        "--branch",
        "my-feature-branch-123",
      ])
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
                environment: "development",
                branch: "my-feature-branch-123",
                format: "json",
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

  describe("given a translation ref that does not exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: factory.whoami() })),
      )
      .stub(KnockApiV1.prototype, "getTranslation", (stub) =>
        stub.resolves(
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

  describe("when translations feature is disabled for the account", () => {
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
      .command(["translation get", "en"])
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
});
