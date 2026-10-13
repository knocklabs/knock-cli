import { expect, test } from "@oclif/test";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/variable/get", () => {
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            key: "stripe_api_key",
            type: "secret",
            description: "Stripe secret key",
            value: "sk_live_super_secret",
            environment_values: {
              development: "sk_dev_super_secret",
              staging: "",
            },
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-04T00:00:00Z",
          },
        }),
      ),
    )
    .stdout()
    .command(["variable get", "stripe_api_key"])
    .it("shows set or unset and never the secret", (ctx) => {
      expect(ctx.stdout).to.contain("stripe_api_key");
      expect(ctx.stdout).to.contain("set");
      expect(ctx.stdout).to.contain("unset");
      expect(ctx.stdout).to.not.contain("sk_live_super_secret");
      expect(ctx.stdout).to.not.contain("sk_dev_super_secret");
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
            environment_values: { development: "sk_dev_super_secret" },
            inserted_at: "2021-01-01T00:00:00Z",
            updated_at: "2021-01-04T00:00:00Z",
          },
        }),
      ),
    )
    .stdout()
    .command(["variable get", "stripe_api_key", "--json"])
    .it("json omits the secret string", (ctx) => {
      const parsed = JSON.parse(ctx.stdout);
      expect(parsed.value).to.equal(null);
      expect(parsed.value_set).to.equal(true);
      expect(parsed.environment_values_set.development).to.equal(true);
      expect(ctx.stdout).to.not.contain("sk_");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .command(["variable get", "app_name", "--branch", "feature-branch"])
    .catch(/Variables are not branch-scoped/)
    .it("rejects --branch");
});
