import { expect } from "chai";

import {
  entryToRequest,
  redactVariable,
  secretEntryAfterPush,
  toFileEntry,
  validateEntry,
  Variable,
} from "@/lib/marshal/variable";

const secret: Variable = {
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
};

describe("variable marshal", () => {
  it("redacts secret strings and records set or unset", () => {
    const redacted = redactVariable(secret);

    expect(JSON.stringify(redacted)).to.not.contain("sk_live_super_secret");
    expect(JSON.stringify(redacted)).to.not.contain("sk_dev_super_secret");
    expect(redacted).to.deep.include({
      value: null,
      value_set: true,
      environment_values: { development: null, staging: null },
      environment_values_set: { development: true, staging: false },
    });
  });

  it("keeps only the effective value when an environment is requested", () => {
    const redacted = redactVariable(
      {
        ...secret,
        value: "sk_prod_super_secret",
        environment_values: undefined,
      },
      "production",
    );

    expect(redacted.environment).to.equal("production");
    expect(redacted.environment_values).to.equal(undefined);
    expect(redacted.value_set).to.equal(true);
    expect(JSON.stringify(redacted)).to.not.contain("sk_prod_super_secret");
  });

  it("writes secret file entries without the API string", () => {
    const entry = toFileEntry(secret);
    expect(entry).to.eql({
      type: "secret",
      description: "Stripe secret key",
      value_set: true,
      environment_values_set: { development: true, staging: false },
    });
    expect(JSON.stringify(entry)).to.not.contain("sk_");
  });

  it("omits nulls and presence flags from the upsert body", () => {
    expect(
      entryToRequest({
        type: "public",
        value: null,
        description: "Name",
        value_set: true,
        environment_values: { development: "Acme Dev", production: null },
      }),
    ).to.eql({
      type: "public",
      description: "Name",
      environment_values: { development: "Acme Dev" },
    });

    expect(
      entryToRequest({
        type: "secret",
        value_set: true,
        environment_values_set: { development: true },
      }),
    ).to.eql({ type: "secret" });

    expect(
      entryToRequest({
        type: "public",
        value: "",
        environment_values: { staging: "" },
      }),
    ).to.eql({
      type: "public",
      value: "",
      environment_values: { staging: "" },
    });
  });

  it("rewrites a pushed secret entry without sending the placeholder back", () => {
    const entry = toFileEntry(secret);
    const body = entryToRequest(entry);
    expect(body).to.eql({
      type: "secret",
      description: "Stripe secret key",
    });
    expect(secretEntryAfterPush(entry, body)).to.eql(entry);
  });

  it("sends a secret string once and rewrites the entry without it", () => {
    const entry = {
      type: "secret" as const,
      value: "sk_live_super_secret",
      environment_values: { development: "sk_dev_super_secret" },
    };
    const body = entryToRequest(entry);

    expect(body).to.eql({
      type: "secret",
      value: "sk_live_super_secret",
      environment_values: { development: "sk_dev_super_secret" },
    });
    const next = secretEntryAfterPush(entry, body);
    expect(next).to.eql({
      type: "secret",
      value_set: true,
      environment_values_set: { development: true },
    });
    expect(JSON.stringify(next)).to.not.contain("sk_");
  });

  it("rejects value_set on a public entry", () => {
    expect(
      validateEntry("app_name", {
        type: "public",
        value: "Acme",
        value_set: true,
      }),
    ).to.include("`app_name` is public and cannot include value_set.");
  });
});
