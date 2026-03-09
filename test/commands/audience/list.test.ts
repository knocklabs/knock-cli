import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/audience/list", () => {
  const emptyAudiencesListResp = factory.resp({
    data: {
      page_info: factory.pageInfo(),
      entries: [],
    },
  });

  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAudiences", (stub) =>
        stub.resolves(emptyAudiencesListResp),
      )
      .stdout()
      .command(["audience list"])
      .it("calls apiV1 listAudiences with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listAudiences as any,
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
      .stub(KnockApiV1.prototype, "listAudiences", (stub) =>
        stub.resolves(emptyAudiencesListResp),
      )
      .stdout()
      .command([
        "audience list",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
        "--limit",
        "5",
        "--after",
        "xyz",
      ])
      .it("calls apiV1 listAudiences with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listAudiences as any,
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

  describe("given a branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAudiences", (stub) =>
        stub.resolves(emptyAudiencesListResp),
      )
      .stdout()
      .command(["audience list", "--branch", "my-feature-branch-123"])
      .it("calls apiV1 listAudiences with expected params", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listAudiences as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                branch: "my-feature-branch-123",
              }),
          ),
        );
      });
  });

  describe("given a list of audiences in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAudiences", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: [
                factory.audience({ key: "audience-1" }),
                factory.audience({ key: "audience-2" }),
                factory.audience({ key: "audience-3" }),
              ],
            },
          }),
        ),
      )
      .stdout()
      .command(["audience list"])
      .it("displays the list of audiences", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 3 audiences in");
        expect(ctx.stdout).to.contain("audience-1");
        expect(ctx.stdout).to.contain("audience-2");
        expect(ctx.stdout).to.contain("audience-3");

        expect(ctx.stdout).to.not.contain("audience-4");
      });
  });

  describe("given the first page of paginated audiences in resp", () => {
    const paginatedAudiencesResp = factory.resp({
      data: {
        page_info: factory.pageInfo({
          after: "xyz",
        }),
        entries: [
          factory.audience({ key: "audience-1" }),
          factory.audience({ key: "audience-2" }),
          factory.audience({ key: "audience-3" }),
        ],
      },
    });

    describe("plus a next page action from the prompt input", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listAudiences", (stub) =>
          stub.resolves(paginatedAudiencesResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "n" })
            .onSecondCall()
            .resolves({ input: "" }),
        )
        .stdout()
        .command(["audience list"])
        .it(
          "calls apiV1 listAudiences for the second time with page params",
          () => {
            const listAudiencesFn = KnockApiV1.prototype.listAudiences as any;

            sinon.assert.calledTwice(listAudiencesFn);

            // First call without page params.
            sinon.assert.calledWith(
              listAudiencesFn.firstCall,
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
              listAudiencesFn.secondCall,
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
        .stub(KnockApiV1.prototype, "listAudiences", (stub) =>
          stub.resolves(paginatedAudiencesResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "p" }),
        )
        .stdout()
        .command(["audience list"])
        .it("calls apiV1 listAudiences once for the initial page only", () => {
          sinon.assert.calledOnce(KnockApiV1.prototype.listAudiences as any);
        });
    });
  });
});
