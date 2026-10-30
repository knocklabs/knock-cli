import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import WarehouseSyncValidate from "@/commands/warehouse-sync/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const localSync = {
  name: "Users",
  warehouse_key: "knock-redshift",
  target_type: "user",
  target: null,
  source: { mode: "sql", query: "SELECT id, email FROM users" },
  primary_key_column: "id",
  mappings: [
    { source_column: "id", target_field: "id" },
    { source_column: "email", target_field: "email" },
  ],
  __readonly: { key: "users", enabled: true, version_id: "abc" },
};

const setupWithStub = (attrs = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(WarehouseSyncValidate, "validateAll", (stub) => stub.resolves([]))
    .stub(KnockApiV1.prototype, "upsertWarehouseSync", (stub) =>
      stub.resolves(factory.resp(attrs)),
    );

const currCwd = process.cwd();

describe("commands/warehouse-sync/push", () => {
  const syncJsonPath = path.resolve(sandboxDir, "users", "warehouse_sync.json");

  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a warehouse sync directory exists, for the key", () => {
    beforeEach(() => {
      fs.outputJsonSync(syncJsonPath, localSync);
      process.chdir(sandboxDir);
    });

    setupWithStub({
      data: {
        warehouse_sync: factory.warehouseSync({ name: "Users from server" }),
      },
    })
      .stdout()
      .command(["warehouse-sync push", "users"])
      .it("sends the writable fields and rewrites the file", (ctx) => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertWarehouseSync as any,
          sinon.match(({ flags }) =>
            isEqual(flags, { "service-token": "valid-token" }),
          ),
          sinon.match((sync) =>
            isEqual(sync, {
              key: "users",
              name: "Users",
              warehouse_key: "knock-redshift",
              target_type: "user",
              target: null,
              source: { mode: "sql", query: "SELECT id, email FROM users" },
              primary_key_column: "id",
              mappings: [
                { source_column: "id", target_field: "id" },
                { source_column: "email", target_field: "email" },
              ],
            }),
          ),
        );

        expect(fs.readJsonSync(syncJsonPath).name).to.equal(
          "Users from server",
        );
        expect(ctx.stdout).to.contain("Successfully pushed 1 warehouse sync");
      });

    setupWithStub({ data: { warehouse_sync: factory.warehouseSync() } })
      .stdout()
      .command([
        "warehouse-sync push",
        "users",
        "--environment",
        "production",
        "--commit",
        "-m",
        "Add users sync",
      ])
      .it("passes the commit flags, if provided", (ctx) => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertWarehouseSync as any,
          sinon.match(({ flags }) =>
            isEqual(flags, {
              "service-token": "valid-token",
              environment: "production",
              commit: true,
              "commit-message": "Add users sync",
            }),
          ),
        );

        expect(ctx.stdout).to.contain("pushed and published");
      });
  });

  describe("given the server refuses the warehouse sync", () => {
    beforeEach(() => {
      fs.outputJsonSync(syncJsonPath, localSync);
      process.chdir(sandboxDir);
    });

    setupWithStub({
      status: 422,
      data: {
        message: "One or more parameters supplied were invalid",
        errors: ["the first mapping must map primary_key_column to id"],
      },
    })
      .stdout()
      .command(["warehouse-sync push", "users"])
      .catch((error) =>
        expect(error.message).to.contain(
          "the first mapping must map primary_key_column to id",
        ),
      )
      .it("throws an error naming the file");
  });

  describe("given a nonexistent warehouse sync directory", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    setupWithStub()
      .stdout()
      .command(["warehouse-sync push", "nope"])
      .catch((error) =>
        expect(error.message).to.match(
          /Cannot locate a warehouse sync directory/,
        ),
      )
      .it("throws an error");
  });
});
