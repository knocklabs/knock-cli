import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { WarehouseSyncData } from "@/lib/marshal/warehouse-sync";

const currCwd = process.cwd();

const setupWithGetStub = (attrs: Partial<WarehouseSyncData> = {}) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getWarehouseSync", (stub) =>
      stub.resolves(factory.resp({ data: factory.warehouseSync(attrs) })),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

const setupWithListStub = (...manyAttrs: Partial<WarehouseSyncData>[]) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listWarehouseSyncs", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            entries: manyAttrs.map((attrs) => factory.warehouseSync(attrs)),
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

describe("commands/warehouse-sync/pull", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a warehouse sync key arg", () => {
    setupWithGetStub({ key: "users" })
      .stdout()
      .command([
        "warehouse-sync pull",
        "users",
        "--environment",
        "production",
        "--hide-uncommitted-changes",
      ])
      .it("calls apiV1 getWarehouseSync with expected props", () => {
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

    setupWithGetStub({ key: "users" })
      .stdout()
      .command(["warehouse-sync pull", "users"])
      .it(
        "writes warehouse_sync.json with read-only fields under __readonly",
        () => {
          const abspath = path.resolve(
            sandboxDir,
            "users",
            "warehouse_sync.json",
          );
          const json = fs.readJsonSync(abspath);

          expect(json.name).to.equal("Users");
          expect(json.warehouse_key).to.equal("knock-redshift");
          expect(json.target_type).to.equal("user");
          expect(json.mappings).to.have.lengthOf(2);
          expect(json).not.to.have.property("enabled");
          expect(json).not.to.have.property("version_id");
          expect(json.__readonly.key).to.equal("users");
          expect(json.__readonly.enabled).to.equal(true);
          expect(json.__readonly.frequency_minutes).to.equal(1440);
          expect(json.__readonly).not.to.have.property("sha");
          expect(json.__readonly).not.to.have.property("updated_at");
        },
      );
  });

  describe("given no warehouse sync key arg nor --all flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["warehouse-sync pull"])
      .catch((error) =>
        expect(error.message).to.match(/^Missing 1 required arg/),
      )
      .it("throws an error");
  });

  describe("given both a warehouse sync key arg and --all flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["warehouse-sync pull", "users", "--all"])
      .catch((error) =>
        expect(error.message).to.match(/cannot also be provided/),
      )
      .it("throws an error");
  });

  describe("given --all and a --warehouse-syncs-dir flag", () => {
    beforeEach(() => {
      // A stale sync directory that no longer exists remotely gets pruned.
      fs.outputJsonSync(
        path.resolve(sandboxDir, "syncs", "old-sync", "warehouse_sync.json"),
        { name: "Old" },
      );
    });

    setupWithListStub({ key: "users" }, { key: "tenants", name: "Tenants" })
      .stdout()
      .command([
        "warehouse-sync pull",
        "--all",
        "--warehouse-syncs-dir",
        "./syncs",
      ])
      .it("writes a directory for each warehouse sync", () => {
        const syncsDir = path.resolve(sandboxDir, "syncs");

        expect(
          fs.pathExistsSync(
            path.resolve(syncsDir, "users/warehouse_sync.json"),
          ),
        ).to.equal(true);
        expect(
          fs.pathExistsSync(
            path.resolve(syncsDir, "tenants/warehouse_sync.json"),
          ),
        ).to.equal(true);
        expect(fs.pathExistsSync(path.resolve(syncsDir, "old-sync"))).to.equal(
          false,
        );
      });
  });
});
