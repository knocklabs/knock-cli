import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/workflow/list", () => {
  const emptyWorkflowsListResp = factory.resp({
    data: {
      page_info: factory.pageInfo(),
      entries: [],
    },
  });

  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listWorkflows", (stub) =>
        stub.resolves(emptyWorkflowsListResp),
      )
      .stdout()
      .command(["workflow list"])
      .it("calls apiV1 listWorkflows with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listWorkflows as any,
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
      .stub(KnockApiV1.prototype, "listWorkflows", (stub) =>
        stub.resolves(emptyWorkflowsListResp),
      )
      .stdout()
      .command([
        "workflow list",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
        "--limit",
        "5",
        "--after",
        "xyz",
      ])
      .it("calls apiV1 listWorkflows with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listWorkflows as any,
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

  describe("given a list of workflows in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listWorkflows", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: [
                factory.workflow({ key: "workflow-1" }),
                factory.workflow({ key: "workflow-2" }),
                factory.workflow({ key: "workflow-3" }),
              ],
            },
          }),
        ),
      )
      .stdout()
      .command(["workflow list"])
      .it("displays the list of workflows", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 3 workflows in");
        expect(ctx.stdout).to.contain("workflow-1");
        expect(ctx.stdout).to.contain("workflow-2");
        expect(ctx.stdout).to.contain("workflow-3");

        expect(ctx.stdout).to.not.contain("workflow-4");
      });
  });

  describe("given the first page of paginated workflows in resp", () => {
    const paginatedWorkflowsResp = factory.resp({
      data: {
        page_info: factory.pageInfo({
          after: "xyz",
        }),
        entries: [
          factory.workflow({ key: "workflow-1" }),
          factory.workflow({ key: "workflow-2" }),
          factory.workflow({ key: "workflow-3" }),
        ],
      },
    });

    describe("plus a next page action from the prompt input", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listWorkflows", (stub) =>
          stub.resolves(paginatedWorkflowsResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "n" })
            .onSecondCall()
            .resolves({ input: "" }),
        )
        .stdout()
        .command(["workflow list"])
        .it(
          "calls apiV1 listWorkflows for the second time with page params",
          () => {
            const listWorkflowsFn = KnockApiV1.prototype.listWorkflows as any;

            sinon.assert.calledTwice(listWorkflowsFn);

            // First call without page params.
            sinon.assert.calledWith(
              listWorkflowsFn.firstCall,
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
              listWorkflowsFn.secondCall,
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
        .stub(KnockApiV1.prototype, "listWorkflows", (stub) =>
          stub.resolves(paginatedWorkflowsResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "p" }),
        )
        .stdout()
        .command(["workflow list"])
        .it("calls apiV1 listWorkflows once for the initial page only", () => {
          sinon.assert.calledOnce(KnockApiV1.prototype.listWorkflows as any);
        });
    });
  });

  describe("given a branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listWorkflows", (stub) =>
        stub.resolves(emptyWorkflowsListResp),
      )
      .stdout()
      .command(["workflow list", "--branch", "my-feature-branch-123"])
      .it("calls apiV1 listWorkflows with expected params", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listWorkflows as any,
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
});
