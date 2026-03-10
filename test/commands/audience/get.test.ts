import { test } from "@oclif/test";
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
        stub.resolves(factory.audience()),
      )
      .stdout()
      .command(["audience get", "foo"])
      .it("calls apiV1 getAudience with correct props", () => {
        const getStub = KnockApiV1.prototype.getAudience as sinon.SinonStub;
        sinon.assert.calledWith(
          getStub,
          "foo",
          sinon.match({
            environment: "development",
          }),
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
        stub.resolves(factory.audience()),
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
        const getStub = KnockApiV1.prototype.getAudience as sinon.SinonStub;
        sinon.assert.calledWith(
          getStub,
          "foo",
          sinon.match({
            environment: "staging",
            hide_uncommitted_changes: true,
          }),
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
        stub.resolves(factory.audience()),
      )
      .stdout()
      .command(["audience get", "foo", "--branch", "my-feature-branch-123"])
      .it("calls apiV1 getAudience with expected params", () => {
        const getStub = KnockApiV1.prototype.getAudience as sinon.SinonStub;
        sinon.assert.calledWith(
          getStub,
          "foo",
          sinon.match({
            environment: "development",
            branch: "my-feature-branch-123",
          }),
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
        stub.rejects(new Error("The resource you requested does not exist")),
      )
      .stdout()
      .command(["audience get", "foo"])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });
});
