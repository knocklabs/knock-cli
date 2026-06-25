import * as path from "node:path";

import { test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { SchemaData } from "@/lib/marshal/schema";

const userSchema: SchemaData = {
  item_type: "user",
  item_id: null,
  properties: [{ key: "email", type: "string", visible: true }],
};

const objectSchema: SchemaData = {
  item_type: "object",
  item_id: "accounts",
  properties: [{ key: "plan", type: "string", visible: true }],
};

const currCwd = process.cwd();

const setupUpsertSchema = (schema = userSchema) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "upsertSchema", (stub) =>
      stub.resolves(factory.resp({ data: { schema } })),
    );

describe("commands/schema/push", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  setupUpsertSchema()
    .do(() => {
      fs.outputJsonSync(path.resolve(sandboxDir, "schemas", "user.json"), {
        $schema: "https://schemas.knock.app/cli/schema.json",
        item_type: "user",
        item_id: null,
        properties: [{ key: "email", type: "string", visible: true }],
        __readonly: { item_type: "user", item_id: null },
      });
    })
    .stdout()
    .command(["schema push", "user"])
    .it("pushes one schema file", () => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.upsertSchema as sinon.SinonStub,
        sinon.match.any,
        "user",
        sinon.match({
          item_type: "user",
          item_id: null,
          properties: [{ key: "email", type: "string", visible: true }],
        }),
        sinon.match((value) => value === undefined, "undefined"),
      );
    });

  setupUpsertSchema(objectSchema)
    .do(() => {
      fs.outputJsonSync(
        path.resolve(sandboxDir, "schemas", "objects", "accounts.json"),
        {
          item_type: "object",
          item_id: "accounts",
          properties: [{ key: "plan", type: "string", visible: true }],
        },
      );
    })
    .stdout()
    .command(["schema push", "object", "--collection", "accounts"])
    .it("pushes one object schema file", () => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.upsertSchema as sinon.SinonStub,
        sinon.match.any,
        "object",
        sinon.match({
          item_type: "object",
          item_id: "accounts",
          properties: [{ key: "plan", type: "string", visible: true }],
        }),
        "accounts",
      );
    });

  setupUpsertSchema()
    .do(() => {
      fs.outputJsonSync(
        path.resolve(sandboxDir, "schemas", "user.json"),
        userSchema,
      );
      fs.outputJsonSync(
        path.resolve(sandboxDir, "schemas", "objects", "accounts.json"),
        objectSchema,
      );
    })
    .stdout()
    .command(["schema push", "--all"])
    .it("pushes every local schema file", () => {
      sinon.assert.calledTwice(
        KnockApiV1.prototype.upsertSchema as sinon.SinonStub,
      );
    });

  setupUpsertSchema()
    .stdout()
    .command(["schema push", "object"])
    .exit(2)
    .it("requires --collection for one object schema push");

  setupUpsertSchema()
    .stdout()
    .command(["schema push", "tenant", "--collection", "accounts"])
    .exit(2)
    .it("rejects --collection for tenant schema push");
});
