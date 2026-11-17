import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as sinon from "sinon";

import KnockApiV1 from "@/lib/api-v1";

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
      .stub(KnockApiV1.prototype, "getDefaultEnvironmentSlug", (stub) =>
        stub.resolves("development"),
      )
      .stub(KnockMgmt.Goals.prototype, "archive", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stdout()
      .command(["goal archive", "trial-conversion", "--force"])
      .it("calls goals.archive and names the default environment", (ctx) => {
        sinon.assert.calledWith(
          KnockMgmt.Goals.prototype.archive as sinon.SinonStub,
          "trial-conversion",
          sinon.match({
            environment: undefined,
          }),
        );
        expect(ctx.stdout).to.contain(
          "Successfully archived goal `trial-conversion` in the `development` environment.",
        );
      });
  });

  describe("given an --environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getDefaultEnvironmentSlug", (stub) =>
        stub.resolves("development"),
      )
      .stub(KnockMgmt.Goals.prototype, "archive", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stdout()
      .command([
        "goal archive",
        "trial-conversion",
        "--environment",
        "staging",
        "--force",
      ])
      .it("names the given environment", (ctx) => {
        sinon.assert.calledWith(
          KnockMgmt.Goals.prototype.archive as sinon.SinonStub,
          "trial-conversion",
          sinon.match({
            environment: "staging",
          }),
        );
        expect(ctx.stdout).to.contain(
          "Successfully archived goal `trial-conversion` in the `staging` environment.",
        );
        sinon.assert.notCalled(
          KnockApiV1.prototype.getDefaultEnvironmentSlug as sinon.SinonStub,
        );
      });
  });

  describe("given confirmation prompt is declined", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getDefaultEnvironmentSlug", (stub) =>
        stub.resolves("development"),
      )
      .stub(KnockMgmt.Goals.prototype, "archive", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: false }),
      )
      .stdout()
      .command(["goal archive", "trial-conversion"])
      .it("names the environment in the prompt and does not archive", (ctx) => {
        expect(ctx.stdout).to.contain("Archive cancelled");
        sinon.assert.calledWith(
          enquirer.prototype.prompt as sinon.SinonStub,
          sinon.match({
            message: sinon.match(
              "Archiving goal `trial-conversion` in the `development` environment.",
            ),
          }),
        );
        sinon.assert.notCalled(
          KnockMgmt.Goals.prototype.archive as sinon.SinonStub,
        );
      });
  });
});
