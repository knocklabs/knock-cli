import KnockMgmt from "@knocklabs/mgmt";
import { test } from "@oclif/test";
import * as sinon from "sinon";

import { factory } from "@/../test/support";

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
      .stub(KnockMgmt.Commits.prototype, "retrieve", (stub) =>
        stub.resolves(factory.commit()),
      )
      .stdout()
      .command(["commit get", "example-id"])
      .it("calls apiV1 getCommit with correct props", () => {
        sinon.assert.calledWith(
          KnockMgmt.Commits.prototype.retrieve as any,
          "example-id",
        );
      });
  });

  describe("given a commit ID arg, and flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Commits.prototype, "retrieve", (stub) =>
        stub.resolves(factory.commit()),
      )
      .stdout()
      .command(["commit get", "example-id", "--json"])
      .it("calls apiV1 getCommit with correct props", () => {
        sinon.assert.calledWith(
          KnockMgmt.Commits.prototype.retrieve as any,
          "example-id",
        );
      });
  });

  describe("given a commit that does not exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Commits.prototype, "retrieve", (stub) =>
        stub.rejects(
          new KnockMgmt.APIError(
            404,
            {
              code: "resource_missing",
              message: "The resource you requested does not exist",
              status: 404,
              type: "api_error",
            },
            undefined,
            undefined,
          ),
        ),
      )
      .stdout()
      .command(["commit get", "foo"])
      .catch("The resource you requested does not exist (status: 404)")
      .it("throws an error for resource not found");
  });
});
