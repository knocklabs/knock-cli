import { test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/partial/get", () => {
  const whoami = {
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: "My cool token",
  };

  describe("given no partial key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["partial get"])
      .exit(2)
      .it("exists with status 2");
  });

  describe("given a partial key arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getPartial", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.partial(),
          }),
        ),
      )
      .stdout()
      .command(["partial get", "foo"])
      .it("calls apiV1 getPartial with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getPartial as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                partialKey: "foo",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",

                environment: "development",
              }),
          ),
        );
      });
  });

  describe("given a partial key arg, and flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getPartial", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.partial(),
          }),
        ),
      )
      .stdout()
      .command([
        "partial get",
        "foo",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
      ])
      .it("calls apiV1 getPartial with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getPartial as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                partialKey: "foo",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",

                "hide-uncommitted-changes": true,
                environment: "staging",
              }),
          ),
        );
      });
  });

  describe("given a partial key that does not exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getPartial", (stub) =>
        stub.resolves(
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
      .command(["partial get", "foo"])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });
});
