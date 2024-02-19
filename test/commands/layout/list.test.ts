import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/layout/list", () => {
  const emptyEmailLayoutsListResp = factory.resp({
    data: {
      page_info: factory.pageInfo(),
      entries: [],
    },
  });

  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listEmailLayouts", (stub) =>
        stub.resolves(emptyEmailLayoutsListResp),
      )
      .stdout()
      .command(["layout list"])
      .it("calls apiV1 listEmailLayouts with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listEmailLayouts as any,
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
      .stub(KnockApiV1.prototype, "listEmailLayouts", (stub) =>
        stub.resolves(emptyEmailLayoutsListResp),
      )
      .stdout()
      .command([
        "layout list",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
        "--limit",
        "5",
        "--after",
        "xyz",
        "--json",
      ])
      .it("calls apiV1 listEmailLayouts with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listEmailLayouts as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "hide-uncommitted-changes": true,
                environment: "staging",
                limit: 5,
                after: "xyz",
                json: true,
              }),
          ),
        );
      });
  });

  describe("given a list of email layouts in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listEmailLayouts", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: [
                factory.emailLayout({ key: "transactional-1" }),
                factory.emailLayout({ key: "transactional-2" }),
                factory.emailLayout({ key: "transactional-3" }),
              ],
            },
          }),
        ),
      )
      .stdout()
      .command(["layout list"])
      .it("displays the list of email layouts", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 3 email layouts in");
        expect(ctx.stdout).to.contain("transactional-1");
        expect(ctx.stdout).to.contain("transactional-2");
        expect(ctx.stdout).to.contain("transactional-3");
        expect(ctx.stdout).to.not.contain("transactional-4");
      });
  });

  describe("given the first page of paginated email layouts in resp", () => {
    const paginatedEmailLayoutsResp = factory.resp({
      data: {
        page_info: factory.pageInfo({
          after: "xyz",
        }),
        entries: [
          factory.emailLayout({ key: "transactional-1" }),
          factory.emailLayout({ key: "transactional-2" }),
          factory.emailLayout({ key: "transactional-3" }),
        ],
      },
    });

    describe("plus a next page action from the prompt input", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listEmailLayouts", (stub) =>
          stub.resolves(paginatedEmailLayoutsResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "n" })
            .onSecondCall()
            .resolves({ input: "" }),
        )
        .stdout()
        .command(["layout list"])
        .it(
          "calls apiV1 listEmailLayouts for the second time with page params",
          () => {
            const listEmailLayoutsFn = KnockApiV1.prototype
              .listEmailLayouts as any;

            sinon.assert.calledTwice(listEmailLayoutsFn);

            // First call without page params.
            sinon.assert.calledWith(
              listEmailLayoutsFn.firstCall,
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
              listEmailLayoutsFn.secondCall,
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
        .stub(KnockApiV1.prototype, "listEmailLayouts", (stub) =>
          stub.resolves(paginatedEmailLayoutsResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "p" }),
        )
        .stdout()
        .command(["layout list"])
        .it(
          "calls apiV1 listEmailLayouts once for the initial page only",
          () => {
            sinon.assert.calledOnce(
              KnockApiV1.prototype.listEmailLayouts as any,
            );
          },
        );
    });
  });
});
