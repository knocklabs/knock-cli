import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/partial/list", () => {
  const emptyPartialsListResp = factory.resp({
    data: {
      page_info: factory.pageInfo(),
      entries: [],
    },
  });

  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listPartials", (stub) =>
        stub.resolves(emptyPartialsListResp),
      )
      .stdout()
      .command(["partial list"])
      .it("calls apiV1 listPartials with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listPartials as any,
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
      .stub(KnockApiV1.prototype, "listPartials", (stub) =>
        stub.resolves(emptyPartialsListResp),
      )
      .stdout()
      .command([
        "partial list",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
        "--limit",
        "5",
        "--after",
        "xyz",
      ])
      .it("calls apiV1 listPartials with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listPartials as any,
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

  describe("given a list of partials in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listPartials", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: [
                factory.partial({ key: "partial-1" }),
                factory.partial({ key: "partial-2" }),
                factory.partial({ key: "partial-3" }),
              ],
            },
          }),
        ),
      )
      .stdout()
      .command(["partial list"])
      .it("displays the list of partials", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 3 partials in");
        expect(ctx.stdout).to.contain("partial-1");
        expect(ctx.stdout).to.contain("partial-2");
        expect(ctx.stdout).to.contain("partial-3");

        expect(ctx.stdout).to.not.contain("partial-4");
      });
  });

  describe("given the first page of paginated partials in resp", () => {
    const paginatedPartialsResp = factory.resp({
      data: {
        page_info: factory.pageInfo({
          after: "xyz",
        }),
        entries: [
          factory.partial({ key: "partial-1" }),
          factory.partial({ key: "partial-2" }),
          factory.partial({ key: "partial-3" }),
        ],
      },
    });

    describe("plus a next page action from the prompt input", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listPartials", (stub) =>
          stub.resolves(paginatedPartialsResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "n" })
            .onSecondCall()
            .resolves({ input: "" }),
        )
        .stdout()
        .command(["partial list"])
        .it(
          "calls apiV1 listPartials for the second time with page params",
          () => {
            const listPartialsFn = KnockApiV1.prototype.listPartials as any;

            sinon.assert.calledTwice(listPartialsFn);

            // First call without page params.
            sinon.assert.calledWith(
              listPartialsFn.firstCall,
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
              listPartialsFn.secondCall,
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
        .stub(KnockApiV1.prototype, "listPartials", (stub) =>
          stub.resolves(paginatedPartialsResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "p" }),
        )
        .stdout()
        .command(["partial list"])
        .it("calls apiV1 listPartials once for the initial page only", () => {
          sinon.assert.calledOnce(KnockApiV1.prototype.listPartials as any);
        });
    });
  });
});
