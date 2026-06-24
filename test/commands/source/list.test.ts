import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/source/list", () => {
  const emptySourcesListResp = factory.resp({
    data: {
      page_info: factory.pageInfo(),
      entries: [],
    },
  });

  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listSources", (stub) =>
        stub.resolves(emptySourcesListResp),
      )
      .stdout()
      .command(["source list"])
      .it("calls apiV1 listSources with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listSources as any,
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
      .stub(KnockApiV1.prototype, "listSources", (stub) =>
        stub.resolves(emptySourcesListResp),
      )
      .stdout()
      .command([
        "source list",
        "--environment",
        "staging",
        "--limit",
        "5",
        "--after",
        "xyz",
      ])
      .it("calls apiV1 listSources with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listSources as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "staging",
                limit: 5,
                after: "xyz",
              }),
          ),
        );
      });
  });

  describe("given a list of sources in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listSources", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: [
                factory.source({ key: "source-1" }),
                factory.source({ key: "source-2" }),
                factory.source({ key: "source-3" }),
              ],
            },
          }),
        ),
      )
      .stdout()
      .command(["source list"])
      .it("displays the list of sources", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 3 sources in");
        expect(ctx.stdout).to.contain("source-1");
        expect(ctx.stdout).to.contain("source-2");
        expect(ctx.stdout).to.contain("source-3");

        expect(ctx.stdout).to.not.contain("source-4");
      });
  });

  describe("given the first page of paginated sources in resp", () => {
    const paginatedSourcesResp = factory.resp({
      data: {
        page_info: factory.pageInfo({
          after: "xyz",
        }),
        entries: [
          factory.source({ key: "source-1" }),
          factory.source({ key: "source-2" }),
          factory.source({ key: "source-3" }),
        ],
      },
    });

    describe("plus a next page action from the prompt input", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listSources", (stub) =>
          stub.resolves(paginatedSourcesResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "n" })
            .onSecondCall()
            .resolves({ input: "" }),
        )
        .stdout()
        .command(["source list"])
        .it(
          "calls apiV1 listSources for the second time with page params",
          () => {
            const listSourcesFn = KnockApiV1.prototype.listSources as any;

            sinon.assert.calledTwice(listSourcesFn);

            // First call without page params.
            sinon.assert.calledWith(
              listSourcesFn.firstCall,
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
              listSourcesFn.secondCall,
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
        .stub(KnockApiV1.prototype, "listSources", (stub) =>
          stub.resolves(paginatedSourcesResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "p" }),
        )
        .stdout()
        .command(["source list"])
        .it("calls apiV1 listSources once for the initial page only", () => {
          sinon.assert.calledOnce(KnockApiV1.prototype.listSources as any);
        });
    });
  });
});
