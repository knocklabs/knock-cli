import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();

describe("commands/variable/set", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(
        factory.resp({ status: 404, data: { message: "not found" } }),
      ),
    )
    .stub(KnockApiV1.prototype, "upsertVariable", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            key: "app_name",
            type: "public",
            description: "Product name",
            value: "Acme",
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-01T00:00:00Z",
          },
        }),
      ),
    )
    .stdout()
    .command([
      "variable set",
      "app_name",
      "--type",
      "public",
      "--value",
      "Acme",
      "--description",
      "Product name",
    ])
    .it("creates a public variable", (ctx) => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
        "app_name",
        { type: "public", value: "Acme", description: "Product name" },
      );
      expect(ctx.stdout).to.contain("Set public variable `app_name`");
      expect(ctx.stdout).to.not.contain("sk_");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            key: "stripe_api_key",
            type: "secret",
            value: "sk_live_super_secret",
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-01T00:00:00Z",
          },
        }),
      ),
    )
    .stub(KnockApiV1.prototype, "upsertVariable", (stub) =>
      stub.resolves(factory.resp()),
    )
    .stdout()
    .command([
      "variable set",
      "stripe_api_key",
      "--value",
      "sk_live_super_secret",
    ])
    .catch(/Refusing to read a secret from the command line/)
    .it("does not accept a secret on the command line", () => {
      sinon.assert.notCalled(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
      );
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            key: "stripe_api_key",
            type: "secret",
            value: "sk_live_super_secret",
            environment_values: { production: "sk_prod_super_secret" },
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-04T00:00:00Z",
          },
        }),
      ),
    )
    .stub(KnockApiV1.prototype, "upsertVariable", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            key: "stripe_api_key",
            type: "secret",
            value: null,
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-05T00:00:00Z",
          },
        }),
      ),
    )
    .do(() => {
      fs.writeFileSync(path.join(sandboxDir, "prod.key"), "from-file-secret");
    })
    .stdout()
    .command([
      "variable set",
      "stripe_api_key",
      "--unset-environment",
      "production",
      "--environment-value-file",
      "development=prod.key",
      "--json",
    ])
    .it("clears with an empty string and does not echo secrets", (ctx) => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
        "stripe_api_key",
        {
          type: "secret",
          environment_values: {
            production: "",
            development: "from-file-secret",
          },
        },
      );
      expect(ctx.stdout).to.not.contain("sk_live_super_secret");
      expect(ctx.stdout).to.not.contain("sk_prod_super_secret");
      expect(ctx.stdout).to.not.contain("from-file-secret");
      const parsed = JSON.parse(ctx.stdout);
      expect(parsed.value).to.equal(null);
      expect(parsed.environment_values_set.production).to.equal(false);
      expect(parsed.environment_values_set.development).to.equal(true);
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            key: "app_name",
            type: "public",
            value: "Acme",
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-01T00:00:00Z",
          },
        }),
      ),
    )
    .stub(KnockApiV1.prototype, "upsertVariable", (stub) =>
      stub.resolves(factory.resp()),
    )
    .command(["variable set", "app_name", "--type", "secret", "--value-stdin"])
    .catch(/Cannot change app_name from public to secret/)
    .it("refuses to change type", () => {
      sinon.assert.notCalled(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
      );
    });
});
