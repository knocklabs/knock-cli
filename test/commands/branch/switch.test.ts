import KnockMgmt from "@knocklabs/mgmt";
import { test } from "@oclif/test";
import * as sinon from "sinon";

import { factory } from "../../support";

describe("commands/branch/switch", () => {
  describe("given an argument containing mixed casing and whitespace", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "get", (stub) =>
        stub.resolves(factory.branch()),
      )
      .command(["branch switch", " Mixed Case   With Whitespace "])
      .it("slugifies input before fetching branch", () => {
        sinon.assert.calledWith(
          KnockMgmt.prototype.get as any,
          "/v1/branches/mixed-case-with-whitespace",
        );
      });
  });

  describe("given an invalid branch slug", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(
        // Attempts to pass in whitespace as the slug
        ["branch switch", " "],
      )
      .catch(/Invalid slug provided/)
      .it("throws an error");
  });

  describe("given no service token", () => {
    test
      .command(["branch switch", "test-branch"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given API error", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "get", (stub) =>
        stub.rejects(
          new KnockMgmt.APIError(
            404,
            {
              code: "branch_not_found",
              message: "The branch you specified was not found in this project",
              status: 404,
              type: "invalid_request_error",
            },
            undefined,
            new Headers(),
          ),
        ),
      )
      .command(["branch switch", "nonexistent-branch"])
      .catch(
        /The branch you specified was not found in this project \(status: 404\)/,
      )
      .it("throws error when API returns error");
  });
});
