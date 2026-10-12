import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import * as sinon from "sinon";

const mockGoal = {
  key: "trial-conversion",
  name: "Trial Conversion",
  description: "Tracks when a trial user converts to paid",
  condition: {
    event: {
      event_type: "integration_source" as const,
      event_key: "order.completed",
      integration_source_key: "stripe",
      recipient_path: "body.userId",
    },
  },
  environment: "development",
  created_at: "2023-09-18T18:32:18.398053Z",
  updated_at: "2023-09-29T19:08:04.129228Z",
  sha: "<SOME_SHA>",
};

describe("commands/goal/get", () => {
  describe("given no goal key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["goal get"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a goal key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Goals.prototype, "retrieve", (stub) =>
        stub.resolves(mockGoal),
      )
      .stdout()
      .command(["goal get", "trial-conversion"])
      .it("calls goals.retrieve and renders the condition", (ctx) => {
        sinon.assert.calledWith(
          KnockMgmt.Goals.prototype.retrieve as sinon.SinonStub,
          "trial-conversion",
          sinon.match({
            environment: "development",
          }),
        );

        expect(ctx.stdout).to.contain("Trial Conversion");
        expect(ctx.stdout).to.contain("integration_source");
        expect(ctx.stdout).to.contain("order.completed");
        expect(ctx.stdout).to.contain("body.userId");
        expect(ctx.stdout).to.not.contain("Target Type");
        expect(ctx.stdout).to.not.contain("Window Size");
      });
  });
});
