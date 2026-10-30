import { expect, test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/warehouse-sync/get", () => {
  describe("given no warehouse sync key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["warehouse-sync get"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a warehouse sync key arg and flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getWarehouseSync", (stub) =>
        stub.resolves(factory.resp({ data: factory.warehouseSync() })),
      )
      .stdout()
      .command([
        "warehouse-sync get",
        "users",
        "--environment",
        "production",
        "--hide-uncommitted-changes",
      ])
      .it("calls apiV1 getWarehouseSync with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getWarehouseSync as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { warehouseSyncKey: "users" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "production",
                "hide-uncommitted-changes": true,
              }),
          ),
        );
      });
  });

  describe("given a warehouse sync in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getWarehouseSync", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.warehouseSync({
              source: { mode: "relation", schema: "public", name: "users" },
            }),
          }),
        ),
      )
      .stdout()
      .command(["warehouse-sync get", "users"])
      .it("displays the warehouse sync and its mappings", (ctx) => {
        expect(ctx.stdout).to.contain("Showing warehouse sync `users`");
        expect(ctx.stdout).to.contain("public.users");
        expect(ctx.stdout).to.contain("knock-redshift");
        expect(ctx.stdout).to.contain("email");
      });
  });

  describe("given a draft warehouse sync with no source yet", () => {
    const draft = factory.warehouseSync({ status: "draft" });
    delete draft.source;
    delete draft.primary_key_column;

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getWarehouseSync", (stub) =>
        stub.resolves(factory.resp({ data: draft })),
      )
      .stdout()
      .command(["warehouse-sync get", "users"])
      .it("displays the draft", (ctx) => {
        expect(ctx.stdout).to.contain("Showing warehouse sync `users`");
        expect(ctx.stdout).to.contain("draft");
      });
  });

  describe("given a warehouse sync that doesn't exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getWarehouseSync", (stub) =>
        stub.resolves(
          factory.resp({
            status: 404,
            statusText: "Not found",
            data: {
              code: "resource_missing",
              message: "The resource you requested does not exist",
              status: 404,
              type: "api_error",
            },
          }),
        ),
      )
      .stdout()
      .command(["warehouse-sync get", "missing"])
      .catch("The resource you requested does not exist")
      .it("throws an error");
  });
});
