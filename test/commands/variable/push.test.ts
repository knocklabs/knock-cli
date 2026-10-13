import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();
const filePath = () => path.join(sandboxDir, "variables.json");

describe("commands/variable/push", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            key: "stripe_api_key",
            type: "secret",
            value: "obfuscated-placeholder",
            description: "Stripe secret key",
            environment_values: { development: "obfuscated-dev" },
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
      fs.writeJsonSync(filePath(), {
        stripe_api_key: {
          type: "secret",
          description: "Stripe secret key",
          value_set: true,
          environment_values_set: { development: true },
        },
      });
    })
    .stdout()
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .command(["variable push", "--force"])
    .it("does not send an obfuscated secret back", () => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
        "stripe_api_key",
        { type: "secret", description: "Stripe secret key" },
      );
      const written = fs.readJsonSync(filePath());
      expect(written.stripe_api_key.value).to.equal(undefined);
      expect(JSON.stringify(written)).to.not.contain("obfuscated");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            key: "app_name",
            type: "public",
            value: "Old",
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
            key: "app_name",
            type: "public",
            description: "Product name",
            value: "Acme",
            environment_values: { development: "Acme Dev", staging: null },
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-02T00:00:00Z",
          },
        }),
      ),
    )
    .do(() => {
      fs.writeJsonSync(filePath(), {
        app_name: {
          type: "public",
          description: "Product name",
          value: "Acme",
          environment_values: { development: "Acme Dev", staging: "" },
        },
        untouched: { type: "public", value: "leave" },
      });
    })
    .stdout()
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .command(["variable push", "app_name", "--force"])
    .it("patches one entry and sends empty string as a clear", () => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
        "app_name",
        {
          type: "public",
          description: "Product name",
          value: "Acme",
          environment_values: { development: "Acme Dev", staging: "" },
        },
      );
      const written = fs.readJsonSync(filePath());
      expect(written.untouched).to.eql({ type: "public", value: "leave" });
      expect(written.app_name.value).to.equal("Acme");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            key: "app_name",
            type: "secret",
            value: "obfuscated-placeholder",
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-01T00:00:00Z",
          },
        }),
      ),
    )
    .stub(KnockApiV1.prototype, "upsertVariable", (stub) =>
      stub.resolves(factory.resp()),
    )
    .do(() => {
      fs.writeJsonSync(filePath(), {
        app_name: { type: "public", value: "Acme" },
      });
    })
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .command(["variable push", "--force"])
    .catch(/Cannot change app_name from secret to public/)
    .it("does not change type", () => {
      sinon.assert.notCalled(
        KnockApiV1.prototype.upsertVariable as sinon.SinonStub,
      );
    });
});
