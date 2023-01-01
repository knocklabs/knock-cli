import { expect, test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/workflow/list", () => {
  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(
        KnockApiV1.prototype,
        "listWorkflows",
        sinon.stub().resolves(
          factory.resp({
            data: {
              pageInfo: factory.pageInfo(),
              entries: [],
            },
          }),
        ),
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
                "api-origin": undefined,
                environment: "development",
              }),
          ),
        );
      });
  });

  describe("given flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(
        KnockApiV1.prototype,
        "listWorkflows",
        sinon.stub().resolves(
          factory.resp({
            data: {
              pageInfo: factory.pageInfo(),
              entries: [],
            },
          }),
        ),
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
                "api-origin": undefined,
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
      .stub(
        KnockApiV1.prototype,
        "listWorkflows",
        sinon.stub().resolves(
          factory.resp({
            data: {
              pageInfo: factory.pageInfo(),
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
});
