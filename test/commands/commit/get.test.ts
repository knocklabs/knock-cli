import { test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/commit/get", () => {
  describe("given no id arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["commit get"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a commit ID arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getCommit", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.commit(),
          }),
        ),
      )
      .stdout()
      .command(["commit get", "example-id"])
      .it("calls apiV1 getCommit with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getCommit as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                id: "example-id",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
              }),
          ),
        );
      });
  });

  describe("given a commit ID arg, and flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getCommit", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.commit(),
          }),
        ),
      )
      .stdout()
      .command(["commit get", "example-id", "--json"])
      .it("calls apiV1 getCommit with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getCommit as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                id: "example-id",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                json: true,
              }),
          ),
        );
      });
  });

  describe("given a commit that does not exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getCommit", (stub) =>
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
      .command(["commit get", "foo"])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });
});
