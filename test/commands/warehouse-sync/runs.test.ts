import { expect, test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/warehouse-sync/runs", () => {
  describe("given no warehouse sync key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["warehouse-sync runs"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given runs in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listWarehouseSyncRuns", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.paginatedResp([
              factory.warehouseSyncRun({ id: "run-1" }),
              factory.warehouseSyncRun({
                id: "run-2",
                status: "failed",
                error: { stage: "extract", message: "Table not found" },
              }),
            ]),
          }),
        ),
      )
      .stdout()
      .command(["warehouse-sync runs", "users", "--environment", "production"])
      .it("calls apiV1 listWarehouseSyncRuns and displays the runs", (ctx) => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listWarehouseSyncRuns as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { warehouseSyncKey: "users" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "production",
              }),
          ),
        );

        expect(ctx.stdout).to.contain("Showing 2 runs of warehouse sync");
        expect(ctx.stdout).to.contain("run-1");
        expect(ctx.stdout).to.contain("Table not found");
      });
  });
});
