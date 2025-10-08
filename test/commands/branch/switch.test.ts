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
});
