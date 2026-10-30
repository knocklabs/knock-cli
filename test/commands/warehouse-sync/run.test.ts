import { expect, test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/warehouse-sync/run", () => {
  describe("given no warehouse sync key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["warehouse-sync run"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a warehouse sync key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "runWarehouseSync", (stub) =>
        stub.resolves(
          factory.resp({
            data: { warehouse_sync: factory.warehouseSync() },
          }),
        ),
      )
      .stdout()
      .command(["warehouse-sync run", "users", "--environment", "production"])
      .it("calls apiV1 runWarehouseSync and points to its runs", (ctx) => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.runWarehouseSync as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { warehouseSyncKey: "users" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "production",
              }),
          ),
        );

        expect(ctx.stdout).to.contain(
          "Started a run of warehouse sync `users`",
        );
        expect(ctx.stdout).to.contain("knock warehouse-sync runs users");
      });
  });

  describe("given the sync is already running", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "runWarehouseSync", (stub) =>
        stub.resolves(
          factory.resp({
            status: 409,
            data: {
              message:
                "A run is already in progress. Try again when it finishes.",
            },
          }),
        ),
      )
      .stdout()
      .command(["warehouse-sync run", "users"])
      .catch((error) =>
        expect(error.message).to.contain("A run is already in progress."),
      )
      .it("throws an error");
  });

  describe("given the sync can't run", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "runWarehouseSync", (stub) =>
        stub.resolves(
          factory.resp({
            status: 422,
            data: {
              message: "One or more parameters supplied were invalid",
              errors: ["Knock couldn't find the sync's published source."],
            },
          }),
        ),
      )
      .stdout()
      .command(["warehouse-sync run", "users"])
      .catch((error) =>
        expect(error.message).to.contain(
          "Knock couldn't find the sync's published source.",
        ),
      )
      .it("throws an error with the reason");
  });
});
