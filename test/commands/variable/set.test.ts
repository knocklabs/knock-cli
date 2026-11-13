import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import { stdinValuePrompt } from "@/commands/variable/set";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();
const originalStdinIsTTY = Object.getOwnPropertyDescriptor(
  process.stdin,
  "isTTY",
);

const setStdinIsTTY = (value: boolean): void => {
  Object.defineProperty(process.stdin, "isTTY", {
    configurable: true,
    value,
  });
};

describe("commands/variable/set", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
    if (originalStdinIsTTY) {
      Object.defineProperty(process.stdin, "isTTY", originalStdinIsTTY);
    }
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
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
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
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
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
    .stub(fs, "readFileSync", (stub) => stub.returns("piped-default"))
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
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .stdout()
    .stderr()
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
          value: "piped-default",
          environment_values: {
            production: "",
            development: "from-file-secret",
          },
        },
      );
      expect(ctx.stderr).to.not.contain("Enter a value");
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
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .command(["variable set", "app_name", "--type", "secret", "--value-stdin"])
    .catch(/Cannot change app_name from public to secret/)
    .it("refuses to change type", () => {
      sinon.assert.notCalled(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
      );
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(fs, "readFileSync", (stub) => stub.returns("from-stdin-secret"))
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(
        factory.resp({ status: 404, data: { message: "not found" } }),
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
            updated_at: "2021-01-01T00:00:00Z",
          },
        }),
      ),
    )
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .stdout()
    .command([
      "variable set",
      "stripe_api_key",
      "--type",
      "secret",
      "--value-stdin",
      "--json",
    ])
    .it("records a stdin secret as set without printing it", (ctx) => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
        "stripe_api_key",
        { type: "secret", value: "from-stdin-secret" },
      );
      const parsed = JSON.parse(ctx.stdout);
      expect(parsed.value_set).to.equal(true);
      expect(parsed.value).to.equal(null);
      expect(ctx.stdout).to.not.contain("from-stdin-secret");
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
      stub.resolves(
        factory.resp({
          data: {
            key: "stripe_api_key",
            type: "secret",
            value: null,
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-02T00:00:00Z",
          },
        }),
      ),
    )
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .stdout()
    .command(["variable set", "stripe_api_key", "--unset-value", "--json"])
    .it("clears a secret default", (ctx) => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
        "stripe_api_key",
        { type: "secret", value: "" },
      );
      expect(JSON.parse(ctx.stdout).value_set).to.equal(false);
      expect(ctx.stdout).to.not.contain("sk_live_super_secret");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .do(() => setStdinIsTTY(false))
    .stub(fs, "readFileSync", (stub) => stub.returns("piped-public"))
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
            value: "piped-public",
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-01T00:00:00Z",
          },
        }),
      ),
    )
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .stdout()
    .stderr()
    .command(["variable set", "app_name", "--type", "public"])
    .it(
      "reads a pipe when no value flag is passed and does not prompt",
      (ctx) => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
          "app_name",
          { type: "public", value: "piped-public" },
        );
        expect(ctx.stderr).to.not.contain(stdinValuePrompt("app_name"));
        expect(ctx.stdout).to.not.contain(stdinValuePrompt("app_name"));
      },
    );

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .do(() => setStdinIsTTY(true))
    .stub(fs, "readFileSync", (stub) => stub.returns("typed-public"))
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
            value: "typed-public",
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-01T00:00:00Z",
          },
        }),
      ),
    )
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .stdout()
    .stderr()
    .command(["variable set", "app_name", "--type", "public"])
    .it("prompts on stderr before reading a terminal", (ctx) => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
        "app_name",
        { type: "public", value: "typed-public" },
      );
      expect(ctx.stderr).to.contain(stdinValuePrompt("app_name"));
      expect(ctx.stdout).to.not.contain("Enter a value");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .do(() => setStdinIsTTY(true))
    .stub(fs, "readFileSync", (stub) => stub.returns("explicit-stdin"))
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
            value: "explicit-stdin",
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-01T00:00:00Z",
          },
        }),
      ),
    )
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .stderr()
    .command(["variable set", "app_name", "--type", "public", "--value-stdin"])
    .it("does not prompt when --value-stdin is passed", (ctx) => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
        "app_name",
        { type: "public", value: "explicit-stdin" },
      );
      expect(ctx.stderr).to.not.contain("Enter a value");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .do(() => setStdinIsTTY(false))
    .stub(fs, "readFileSync", (stub) => stub.returns("from-stdin-secret"))
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(
        factory.resp({ status: 404, data: { message: "not found" } }),
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
            updated_at: "2021-01-01T00:00:00Z",
          },
        }),
      ),
    )
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .stdout()
    .stderr()
    .command(["variable set", "stripe_api_key", "--type", "secret", "--json"])
    .it("reads a secret from a pipe instead of the command line", (ctx) => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
        "stripe_api_key",
        { type: "secret", value: "from-stdin-secret" },
      );
      expect(ctx.stderr).to.not.contain(stdinValuePrompt("stripe_api_key"));
      expect(ctx.stdout).to.not.contain("from-stdin-secret");
      expect(JSON.parse(ctx.stdout).value_set).to.equal(true);
    });
});
