import { expect, test } from "@oclif/test";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { Variable } from "@/lib/marshal/variable";

const variables: Variable[] = [
  {
    key: "app_name",
    type: "public",
    description: "Product name",
    value: "Acme",
    environment_values: {
      development: "Acme Dev",
      production: "Acme Prod",
    },
    inserted_at: "2021-01-01T00:00:00Z",
    updated_at: "2021-01-01T00:00:00Z",
  },
  {
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
];

const listResp = () =>
  factory.resp({
    data: {
      entries: variables,
      page_info: factory.pageInfo(),
    },
  });

describe("commands/variable/list", () => {
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listVariables", (stub) =>
      stub.resolves(listResp()),
    )
    .stdout()
    .command(["variable list"])
    .it(
      "shows defaults and every environment value without secret strings",
      (ctx) => {
        expect(ctx.stdout).to.contain("Showing 2 variables in the project");
        expect(ctx.stdout).to.contain("app_name");
        expect(ctx.stdout).to.contain("Acme Dev");
        expect(ctx.stdout).to.contain("Acme Prod");
        expect(ctx.stdout).to.contain("development: set");
        expect(ctx.stdout).to.contain("staging: unset");
        expect(ctx.stdout).to.not.contain("sk_live_super_secret");
        expect(ctx.stdout).to.not.contain("sk_dev_super_secret");
      },
    );

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listVariables", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            entries: [
              {
                ...variables[0],
                value: "Acme Prod",
                environment_values: {
                  development: "Acme Dev",
                  staging: "Acme Stage",
                },
              },
            ],
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stdout()
    .command(["variable list", "--environment", "production"])
    .it("shows only the value for that environment", (ctx) => {
      expect(ctx.stdout).to.contain("Showing 1 variable in `production`");
      expect(ctx.stdout).to.contain("Acme Prod");
      expect(ctx.stdout).to.not.contain("Acme Dev");
      expect(ctx.stdout).to.not.contain("Acme Stage");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listVariables", (stub) =>
      stub.resolves(listResp()),
    )
    .stdout()
    .command(["variable list", "--json"])
    .it("returns redacted json", (ctx) => {
      const parsed = JSON.parse(ctx.stdout);
      expect(parsed.entries[1].value).to.equal(null);
      expect(parsed.entries[1].value_set).to.equal(true);
      expect(parsed.entries[1].environment_values_set.development).to.equal(
        true,
      );
      expect(ctx.stdout).to.not.contain("sk_live_super_secret");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listVariables", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            entries: [
              {
                ...variables[1],
                value: "sk_prod_super_secret",
                environment_values: undefined,
              },
            ],
            page_info: factory.pageInfo(),
          },
        }),
      ),
    )
    .stdout()
    .command(["variable list", "--environment", "production", "--json"])
    .it("redacts an environment-scoped secret", (ctx) => {
      const parsed = JSON.parse(ctx.stdout);
      expect(parsed.entries[0].environment).to.equal("production");
      expect(parsed.entries[0].value_set).to.equal(true);
      expect(parsed.entries[0].environment_values).to.equal(undefined);
      expect(ctx.stdout).to.not.contain("sk_prod_super_secret");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .command(["variable list", "--branch", "feature-branch"])
    .catch(/Variables are not branch-scoped/)
    .it("rejects --branch");
});
