import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();

const catalog = [
  {
    key: "app_name",
    type: "public",
    description: "Product name",
    value: "Acme",
    environment_values: { development: "Acme Dev", production: "Acme Prod" },
    inserted_at: "2021-01-01T00:00:00Z",
    updated_at: "2021-01-01T00:00:00Z",
  },
  {
    key: "stripe_api_key",
    type: "secret",
    description: "Stripe secret key",
    value: "sk_live_super_secret",
    environment_values: { development: "sk_dev_super_secret", staging: "" },
    inserted_at: "2021-01-01T00:00:00Z",
    updated_at: "2021-01-04T00:00:00Z",
  },
];

describe("commands/variable/pull", () => {
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
    .stub(KnockApiV1.prototype, "listVariables", (stub) =>
      stub.resolves(
        factory.resp({
          data: { entries: catalog, page_info: factory.pageInfo() },
        }),
      ),
    )
    .do(() => {
      fs.writeJsonSync(path.join(sandboxDir, "variables.json"), {
        retired: { type: "public", value: "gone" },
      });
    })
    .stdout()
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .command(["variable pull", "--force"])
    .it("writes one file and drops variables that disappeared", (ctx) => {
      const written = fs.readJsonSync(path.join(sandboxDir, "variables.json"));
      expect(written).to.eql({
        app_name: {
          type: "public",
          description: "Product name",
          value: "Acme",
          environment_values: {
            development: "Acme Dev",
            production: "Acme Prod",
          },
        },
        stripe_api_key: {
          type: "secret",
          description: "Stripe secret key",
          value_set: true,
          environment_values_set: { development: true, staging: false },
        },
      });
      expect(JSON.stringify(written)).to.not.contain("sk_");
      expect(ctx.stdout).to.contain("1 removed");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(factory.resp({ data: catalog[0] })),
    )
    .do(() => {
      fs.writeJsonSync(path.join(sandboxDir, "variables.json"), {
        keep_me: { type: "public", value: "stay" },
      });
    })
    .stdout()
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .command(["variable pull", "app_name"])
    .it("updates one entry and leaves the others", () => {
      const written = fs.readJsonSync(path.join(sandboxDir, "variables.json"));
      expect(written.keep_me).to.eql({ type: "public", value: "stay" });
      expect(written.app_name.value).to.equal("Acme");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "listVariables", (stub) => {
      stub.onFirstCall().resolves(
        factory.resp({
          data: {
            entries: [catalog[0]],
            page_info: factory.pageInfo({ after: "cursor-2" }),
          },
        }),
      );
      stub.onSecondCall().resolves(
        factory.resp({
          data: {
            entries: [catalog[1]],
            page_info: factory.pageInfo(),
          },
        }),
      );
    })
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .stdout()
    .command(["variable pull", "--force"])
    .it("follows the after cursor", () => {
      const written = fs.readJsonSync(path.join(sandboxDir, "variables.json"));
      expect(Object.keys(written)).to.eql(["app_name", "stripe_api_key"]);
      sinon.assert.calledWith(
        KnockApiV1.prototype.listVariables as sinon.SinonStub,
        sinon.match({ after: "cursor-2" }),
      );
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(
        factory.resp({ status: 404, data: { message: "not found" } }),
      ),
    )
    .do(() => {
      fs.writeJsonSync(path.join(sandboxDir, "variables.json"), {
        stripe_api_key: { type: "secret", value_set: true },
        keep_me: { type: "public", value: "stay" },
      });
    })
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .stdout()
    .command(["variable pull", "stripe_api_key", "--force"])
    .it("removes a missing key and leaves the other entries", () => {
      const written = fs.readJsonSync(path.join(sandboxDir, "variables.json"));
      expect(written.stripe_api_key).to.equal(undefined);
      expect(written.keep_me.value).to.equal("stay");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "getVariable", (stub) =>
      stub.resolves(
        factory.resp({ status: 404, data: { message: "not found" } }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.resolves({ input: false }),
    )
    .do(() => {
      fs.writeJsonSync(path.join(sandboxDir, "variables.json"), {
        stripe_api_key: {
          type: "secret",
          value: "local-only-secret",
        },
      });
    })
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .stdout()
    .command(["variable pull", "stripe_api_key"])
    .it(
      "does not delete a local-only entry when confirmation is declined",
      () => {
        const written = fs.readJsonSync(
          path.join(sandboxDir, "variables.json"),
        );
        expect(written.stripe_api_key.value).to.equal("local-only-secret");
      },
    );

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .command(["variable pull", "--branch", "feature-branch", "--force"])
    .catch(/Variables are not branch-scoped/)
    .it("rejects --branch");
});
