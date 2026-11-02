import { expect, test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/warehouse/get", () => {
  describe("given no warehouse key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["warehouse get"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a warehouse key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getWarehouse", (stub) =>
        stub.resolves(factory.resp({ data: factory.warehouse() })),
      )
      .stdout()
      .command(["warehouse get", "knock-redshift"])
      .it("calls apiV1 getWarehouse and displays the warehouse", (ctx) => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getWarehouse as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { warehouseKey: "knock-redshift" }) &&
              isEqual(flags, { "service-token": "valid-token" }),
          ),
        );

        expect(ctx.stdout).to.contain("Showing warehouse `knock-redshift`");
        expect(ctx.stdout).to.contain("warehouse.example.com");
        expect(ctx.stdout).to.contain("connected");
      });
  });

  describe("given a warehouse that doesn't exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getWarehouse", (stub) =>
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
      .command(["warehouse get", "missing"])
      .catch("The resource you requested does not exist")
      .it("throws an error");
  });
});
