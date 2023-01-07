import { test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/workflow/get", () => {
  describe("given no workflow key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["workflow get"])
      .exit(2)
      .it("exists with status 2");
  });

  describe("given a workflow key arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(
        KnockApiV1.prototype,
        "getWorkflow",
        sinon.stub().resolves(
          factory.resp({
            data: factory.workflow(),
          }),
        ),
      )
      .stdout()
      .command(["workflow get", "foo"])
      .it("calls apiV1 getWorkflow with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getWorkflow as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                workflowKey: "foo",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "api-origin": undefined,
                environment: "development",
              }),
          ),
        );
      });
  });

  describe("given a workflow key arg, and flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(
        KnockApiV1.prototype,
        "getWorkflow",
        sinon.stub().resolves(
          factory.resp({
            data: factory.workflow(),
          }),
        ),
      )
      .stdout()
      .command([
        "workflow get",
        "foo",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
      ])
      .it("calls apiV1 getWorkflow with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getWorkflow as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                workflowKey: "foo",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "api-origin": undefined,
                "hide-uncommitted-changes": true,
                environment: "staging",
              }),
          ),
        );
      });
  });

  describe("given a workflow key that does not exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(
        KnockApiV1.prototype,
        "getWorkflow",
        sinon.stub().resolves(
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
      .command(["workflow get", "foo"])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });
});
