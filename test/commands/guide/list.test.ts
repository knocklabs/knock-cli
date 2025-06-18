import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/guide/list", () => {
  const emptyGuidesListResp = factory.resp({
    data: {
      page_info: factory.pageInfo(),
      entries: [],
    },
  });

  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listGuides", (stub) =>
        stub.resolves(emptyGuidesListResp),
      )
      .stdout()
      .command(["guide list"])
      .it("calls apiV1 listGuides with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listGuides as any,
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
      .stub(KnockApiV1.prototype, "listGuides", (stub) =>
        stub.resolves(emptyGuidesListResp),
      )
      .stdout()
      .command([
        "guide list",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
        "--limit",
        "5",
        "--after",
        "xyz",
      ])
      .it("calls apiV1 listGuides with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listGuides as any,
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

  describe("given a list of guides in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listGuides", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: [
                factory.guide({ key: "guide-1" }),
                factory.guide({ key: "guide-2" }),
                factory.guide({ key: "guide-3" }),
              ],
            },
          }),
        ),
      )
      .stdout()
      .command(["guide list"])
      .it("displays the list of guides", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 3 guides in");
        expect(ctx.stdout).to.contain("guide-1");
        expect(ctx.stdout).to.contain("guide-2");
        expect(ctx.stdout).to.contain("guide-3");

        expect(ctx.stdout).to.not.contain("guide-4");
      });
  });

  describe("given the first page of paginated guides in resp", () => {
    const paginatedGuidesResp = factory.resp({
      data: {
        page_info: factory.pageInfo({
          after: "xyz",
        }),
        entries: [
          factory.guide({ key: "guide-1" }),
          factory.guide({ key: "guide-2" }),
          factory.guide({ key: "guide-3" }),
        ],
      },
    });

    describe("plus a next page action from the prompt input", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listGuides", (stub) =>
          stub.resolves(paginatedGuidesResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "n" })
            .onSecondCall()
            .resolves({ input: "" }),
        )
        .stdout()
        .command(["guide list"])
        .it(
          "calls apiV1 listGuides for the second time with page params",
          () => {
            const listGuidesFn = KnockApiV1.prototype.listGuides as any;

            sinon.assert.calledTwice(listGuidesFn);

            // First call without page params.
            sinon.assert.calledWith(
              listGuidesFn.firstCall,
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
              listGuidesFn.secondCall,
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
        .stub(KnockApiV1.prototype, "listGuides", (stub) =>
          stub.resolves(paginatedGuidesResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "p" }),
        )
        .stdout()
        .command(["guide list"])
        .it("calls apiV1 listGuides once for the initial page only", () => {
          sinon.assert.calledOnce(KnockApiV1.prototype.listGuides as any);
        });
    });
  });
});
