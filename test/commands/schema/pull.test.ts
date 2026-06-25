import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
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

const setupGetSchema = (schema = userSchema) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.resolves({ input: true }),
    )
    .stub(KnockApiV1.prototype, "getSchema", (stub) =>
      stub.resolves(factory.resp({ data: { schema } })),
    );

describe("commands/schema/pull", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  setupGetSchema()
    .stdout()
    .command(["schema pull", "user", "--force"])
    .it("pulls one user schema into schemas/user.json", () => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.getSchema as sinon.SinonStub,
        sinon.match.any,
        "user",
        sinon.match((value) => value === undefined, "undefined"),
      );

      const schemaPath = path.resolve(sandboxDir, "schemas", "user.json");
      expect(fs.existsSync(schemaPath)).to.be.true;
      expect(fs.readJsonSync(schemaPath)).to.eql({
        $schema: "https://schemas.knock.app/cli/schema.json",
        item_type: "user",
        item_id: null,
        properties: [{ key: "email", type: "string", visible: true }],
        __readonly: { item_type: "user", item_id: null },
      });
    });

  setupGetSchema(objectSchema)
    .stdout()
    .command(["schema pull", "object", "--collection", "accounts", "--force"])
    .it("pulls one object schema into schemas/objects/:collection.json", () => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.getSchema as sinon.SinonStub,
        sinon.match.any,
        "object",
        "accounts",
      );

      const schemaPath = path.resolve(
        sandboxDir,
        "schemas",
        "objects",
        "accounts.json",
      );
      expect(fs.existsSync(schemaPath)).to.be.true;
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.resolves({ input: true }),
    )
    .stub(KnockApiV1.prototype, "listSchemas", (stub) =>
      stub.resolves(
        factory.resp({
          data: factory.paginatedResp([userSchema, objectSchema]),
        }),
      ),
    )
    .stdout()
    .command(["schema pull", "--all", "--force"])
    .it("pulls all schemas returned by the list endpoint", () => {
      sinon.assert.calledOnce(
        KnockApiV1.prototype.listSchemas as sinon.SinonStub,
      );

      expect(fs.existsSync(path.resolve(sandboxDir, "schemas", "user.json"))).to
        .be.true;
      expect(
        fs.existsSync(
          path.resolve(sandboxDir, "schemas", "objects", "accounts.json"),
        ),
      ).to.be.true;
    });

  setupGetSchema()
    .stdout()
    .command(["schema pull", "object"])
    .exit(2)
    .it("requires --collection for one object schema pull");

  setupGetSchema()
    .stdout()
    .command(["schema pull", "user", "--collection", "accounts"])
    .exit(2)
    .it("rejects --collection for user schema pull");
});
