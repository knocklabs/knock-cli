import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/translation/list", () => {
  const emptyTranslationListResp = factory.resp({
    data: {
      page_info: factory.pageInfo(),
      entries: [],
    },
  });

  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listTranslations", (stub) =>
        stub.resolves(emptyTranslationListResp),
      )
      .stdout()
      .command(["translation list"])
      .it("calls apiV1 listTranslations with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listTranslations as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                "service-token": "valid-token",

                environment: "development",
              }),
          ),
        );
      });
  });

  describe("given flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listTranslations", (stub) =>
        stub.resolves(emptyTranslationListResp),
      )
      .stdout()
      .command([
        "translation list",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
        "--limit",
        "5",
        "--after",
        "xyz",
      ])
      .it("calls apiV1 listTranslations with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listTranslations as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "hide-uncommitted-changes": true,
                environment: "staging",
                limit: 5,
                after: "xyz",
              }),
          ),
        );
      });
  });

  describe("given a list of translations in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listTranslations", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: [
                factory.translation({ locale_code: "en-CA" }),
                factory.translation({ locale_code: "en-GB" }),
                factory.translation({ locale_code: "fr" }),
              ],
            },
          }),
        ),
      )
      .stdout()
      .command(["translation list"])
      .it("displays the list of translations", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 3 translations in");
        expect(ctx.stdout).to.contain("en-CA");
        expect(ctx.stdout).to.contain("en-GB");
        expect(ctx.stdout).to.contain("fr");

        expect(ctx.stdout).to.not.contain("es-ES");
      });
  });

  describe("given the first page of paginated translations in resp", () => {
    const paginatedTranslationsResp = factory.resp({
      data: {
        page_info: factory.pageInfo({
          after: "xyz",
        }),
        entries: [
          factory.translation({ locale_code: "de" }),
          factory.translation({ locale_code: "it" }),
          factory.translation({ locale_code: "ja" }),
        ],
      },
    });

    describe("plus a next page action from the prompt input", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listTranslations", (stub) =>
          stub.resolves(paginatedTranslationsResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "n" })
            .onSecondCall()
            .resolves({ input: "" }),
        )
        .stdout()
        .command(["translation list"])
        .it(
          "calls apiV1 listTranslations for the second time with page params",
          () => {
            const listTranslationsFn = KnockApiV1.prototype
              .listTranslations as any;

            sinon.assert.calledTwice(listTranslationsFn);

            // First call without page params.
            sinon.assert.calledWith(
              listTranslationsFn.firstCall,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    "service-token": "valid-token",

                    environment: "development",
                  }),
              ),
            );

            // Second call with page params to fetch the next page.
            sinon.assert.calledWith(
              listTranslationsFn.secondCall,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    "service-token": "valid-token",

                    environment: "development",
                    after: "xyz",
                  }),
              ),
            );
          },
        );
    });

    describe("plus a previous page action input from the prompt", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listTranslations", (stub) =>
          stub.resolves(paginatedTranslationsResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "p" }),
        )
        .stdout()
        .command(["translation list"])
        .it(
          "calls apiV1 listTranslations once for the initial page only",
          () => {
            sinon.assert.calledOnce(
              KnockApiV1.prototype.listTranslations as any,
            );
          },
        );
    });
  });
});
