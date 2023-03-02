import { test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "activateWorkflow",
      sinon.stub().resolves(factory.resp(attrs)),
    )
    .stub(
      enquirer.prototype,
      "prompt",
      sinon.stub().onFirstCall().resolves({ input: "y" }),
    );

describe("commands/workflow/activate", () => {
  describe("given no workflow key arg", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command(["workflow activate"])
      .exit(2)
      .it("exists with status 2");
  });

  describe("given no environment flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command(["workflow activate", "workflow-x"])
      .exit(2)
      .it("exists with status 2");
  });

  describe("given the workflow key arg and the environment flag", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command(["workflow activate", "workflow-x", "--environment", "staging"])
      .it("calls apiV1 activateWorkflow with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.activateWorkflow as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                workflowKey: "workflow-x",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "api-origin": undefined,
                environment: "staging",
                // True by default for activating a workflow.
                status: true,
              }),
          ),
        );
      });
  });

  describe("given the status flag set to false (for deactivating)", () => {
    setupWithStub({ data: { workflow: factory.workflow() } })
      .stdout()
      .command([
        "workflow activate",
        "workflow-x",
        "--environment",
        "staging",
        "--status",
        "false",
      ])
      .it("calls apiV1 activateWorkflow with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.activateWorkflow as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                workflowKey: "workflow-x",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "api-origin": undefined,
                environment: "staging",
                // False for deactivating a workflow.
                status: false,
              }),
          ),
        );
      });
  });
});
