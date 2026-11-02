import { expect, test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/warehouse-sync/list", () => {
  describe("given flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listWarehouseSyncs", (stub) =>
        stub.resolves(factory.resp({ data: factory.paginatedResp([]) })),
      )
      .stdout()
      .command([
        "warehouse-sync list",
        "--environment",
        "production",
        "--hide-uncommitted-changes",
        "--after",
        "xyz",
      ])
      .it("calls apiV1 listWarehouseSyncs with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listWarehouseSyncs as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "production",
                "hide-uncommitted-changes": true,
                after: "xyz",
              }),
          ),
        );
      });
  });

  describe("given a list of warehouse syncs in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listWarehouseSyncs", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.paginatedResp([
              factory.warehouseSync({ key: "users" }),
              factory.warehouseSync({
                key: "projects",
                target_type: "object",
                target: { collection: "projects" },
                status: "paused",
              }),
            ]),
          }),
        ),
      )
      .stdout()
      .command(["warehouse-sync list"])
      .it("displays the list of warehouse syncs", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 2 warehouse syncs");
        expect(ctx.stdout).to.contain("users");
        expect(ctx.stdout).to.contain("Objects (projects)");
        expect(ctx.stdout).to.contain("paused");
      });
  });
});
