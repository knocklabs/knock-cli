import { test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/audience/get", () => {
  const whoami = {
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: "My cool token",
  };

  describe("given no audience key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["audience get"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given an audience key arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getAudience", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.audience(),
          }),
        ),
      )
      .stdout()
      .command(["audience get", "foo"])
      .it("calls apiV1 getAudience with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getAudience as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                audienceKey: "foo",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",

                environment: "development",
              }),
          ),
        );
      });
  });

  describe("given an audience key arg, and flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getAudience", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.audience(),
          }),
        ),
      )
      .stdout()
      .command([
        "audience get",
        "foo",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
      ])
      .it("calls apiV1 getAudience with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getAudience as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                audienceKey: "foo",
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

  describe("given a branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getAudience", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.audience(),
          }),
        ),
      )
      .stdout()
      .command(["audience get", "foo", "--branch", "my-feature-branch-123"])
      .it("calls apiV1 getAudience with expected params", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getAudience as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                audienceKey: "foo",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                branch: "my-feature-branch-123",
              }),
          ),
        );
      });
  });

  describe("given an audience key that does not exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getAudience", (stub) =>
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
      .command(["audience get", "foo"])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });
});
