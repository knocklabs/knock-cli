import { test } from "@oclif/test";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { browser } from "@/lib/helpers/browser";

describe("commands/warehouse-sync/open", () => {
  describe("given no warehouse sync key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["warehouse-sync open"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a warehouse sync key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(
          factory.resp({ data: factory.whoami({ account_slug: "collab-io" }) }),
        ),
      )
      .stub(KnockApiV1.prototype, "getWarehouseSync", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.warehouseSync({
              key: "users",
              environment: "production",
            }),
          }),
        ),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["warehouse-sync open", "users", "--environment", "production"])
      .it("opens the sync's page under its warehouse", () => {
        sinon.assert.calledWith(
          browser.openUrl as any,
          "https://dashboard.knock.app/collab-io/production/sources/knock-redshift/syncs/users",
        );
      });
  });
});
