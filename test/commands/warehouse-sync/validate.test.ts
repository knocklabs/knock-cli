import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();

describe("commands/warehouse-sync/validate", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.outputJsonSync(path.resolve(sandboxDir, "users/warehouse_sync.json"), {
      name: "Users",
      primary_key_column: "id",
      mappings: [{ source_column: "id", target_field: "id" }],
      __readonly: { key: "users", status: "live" },
    });
    fs.outputJsonSync(path.resolve(sandboxDir, "tenants/warehouse_sync.json"), {
      name: "Tenants",
    });
    process.chdir(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a warehouse sync key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "validateWarehouseSync", (stub) =>
        stub.resolves(factory.resp({ data: { warehouse_sync: {} } })),
      )
      .stdout()
      .command(["warehouse-sync validate", "users"])
      .it("validates the sync without its read-only fields", (ctx) => {
        sinon.assert.calledOnceWithExactly(
          KnockApiV1.prototype.validateWarehouseSync as any,
          sinon.match.any,
          sinon.match((sync) =>
            isEqual(sync, {
              key: "users",
              name: "Users",
              primary_key_column: "id",
              mappings: [{ source_column: "id", target_field: "id" }],
            }),
          ),
        );

        expect(ctx.stdout).to.contain("Successfully validated 1");
      });
  });

  describe("given --all, with one invalid warehouse sync", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "validateWarehouseSync", (stub) => {
        stub
          .withArgs(sinon.match.any, sinon.match({ key: "tenants" }))
          .resolves(
            factory.resp({
              status: 422,
              data: { errors: [{ message: "primary_key_column is required" }] },
            }),
          );
        stub.resolves(factory.resp({ data: { warehouse_sync: {} } }));
        return stub;
      })
      .stdout()
      .command(["warehouse-sync validate", "--all"])
      .catch((error) => {
        expect(error.message).to.contain("tenants/warehouse_sync.json");
        expect(error.message).to.contain("primary_key_column is required");
        expect(error.message).not.to.contain("users/warehouse_sync.json");
      })
      .it("throws an error for the invalid one");
  });
});
