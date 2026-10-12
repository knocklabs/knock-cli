import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as sinon from "sinon";

describe("commands/goal/archive", () => {
  describe("given no goal key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["goal archive"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a goal key arg with --force flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Goals.prototype, "archive", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stdout()
      .command(["goal archive", "trial-conversion", "--force"])
      .it("calls goals.archive with correct props", () => {
        sinon.assert.calledWith(
          KnockMgmt.Goals.prototype.archive as sinon.SinonStub,
          "trial-conversion",
          sinon.match({
            environment: "development",
          }),
        );
      });
  });

  describe("given confirmation prompt is declined", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Goals.prototype, "archive", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: false }),
      )
      .stdout()
      .command(["goal archive", "trial-conversion"])
      .it("does not call archive when declined", (ctx) => {
        expect(ctx.stdout).to.contain("Archive cancelled");
        sinon.assert.notCalled(
          KnockMgmt.Goals.prototype.archive as sinon.SinonStub,
        );
      });
  });
});
