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

describe("commands/goal/list", () => {
  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Goals.prototype, "list", (stub) =>
        stub.resolves({
          entries: [mockGoal],
          page_info: { after: undefined },
        }),
      )
      .stdout()
      .command(["goal list"])
      .it("calls goals.list and renders condition columns", (ctx) => {
        sinon.assert.calledWith(
          KnockMgmt.Goals.prototype.list as sinon.SinonStub,
          sinon.match({
            environment: undefined,
          }),
        );

        expect(ctx.stdout).to.contain("trial-conversion");
        expect(ctx.stdout).to.contain("Trial Conversion");
        expect(ctx.stdout).to.contain("integration_source");
        expect(ctx.stdout).to.contain("order.completed");
        expect(ctx.stdout).to.not.contain("Target");
        expect(ctx.stdout).to.not.contain("Window");
      });
  });
});
