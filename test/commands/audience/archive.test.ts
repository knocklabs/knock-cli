import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as sinon from "sinon";

import KnockApiV1 from "@/lib/api-v1";

describe("commands/audience/archive", () => {
  describe("given no audience key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["audience archive", "--environment", "development"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given no environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["audience archive", "vip-users"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given an audience key arg with --force flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "archiveAudience", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stdout()
      .command([
        "audience archive",
        "vip-users",
        "--environment",
        "development",
        "--force",
      ])
      .it("calls apiV1 archiveAudience with correct props", () => {
        const archiveStub = KnockApiV1.prototype.archiveAudience as sinon.SinonStub;
        sinon.assert.calledWith(archiveStub, "vip-users", "development");
      });
  });

  describe("given confirmation prompt is declined", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "archiveAudience", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: false }),
      )
      .stdout()
      .command([
        "audience archive",
        "vip-users",
        "--environment",
        "development",
      ])
      .it("does not call archiveAudience when declined", (ctx) => {
        expect(ctx.stdout).to.contain("Archive cancelled");
        const archiveStub = KnockApiV1.prototype.archiveAudience as sinon.SinonStub;
        sinon.assert.notCalled(archiveStub);
      });
  });

  describe("given archive fails", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "archiveAudience", (stub) =>
        stub.rejects(new Error("The resource you requested does not exist")),
      )
      .stdout()
      .command([
        "audience archive",
        "vip-users",
        "--environment",
        "development",
        "--force",
      ])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });
});
