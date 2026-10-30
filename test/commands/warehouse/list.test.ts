import { expect, test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/warehouse/list", () => {
  describe("given flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listWarehouses", (stub) =>
        stub.resolves(factory.resp({ data: factory.paginatedResp([], {}) })),
      )
      .stdout()
      .command(["warehouse list", "--environment", "staging", "--limit", "5"])
      .it("calls apiV1 listWarehouses with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listWarehouses as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "staging",
                limit: 5,
              }),
          ),
        );
      });
  });

  describe("given a list of warehouses in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listWarehouses", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.paginatedResp([
              factory.warehouse({ key: "knock-redshift" }),
              factory.warehouse({ key: "knock-snowflake", type: "snowflake" }),
            ]),
          }),
        ),
      )
      .stdout()
      .command(["warehouse list"])
      .it("displays the list of warehouses", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 2 warehouses");
        expect(ctx.stdout).to.contain("knock-redshift");
        expect(ctx.stdout).to.contain("knock-snowflake");
      });
  });
});
