import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import nock from "nock";

const openApiFixturePath = path.resolve(
  __dirname,
  "../../support/fixtures/mapi-openapi.json",
);

describe("commands/mapi/index", () => {
  afterEach(() => {
    nock.cleanAll();
    process.exitCode = undefined;
  });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app")
        .get("/v1/openapi")
        .reply(200, spec)
        .get("/v1/whoami")
        .reply(200, { account_name: "Collab" });
    })
    .command(["mapi", "/v1/whoami"])
    .it("prints whoami response", (ctx) => {
      expect(ctx.stdout).to.contain("Collab");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app")
        .get("/v1/openapi")
        .reply(200, spec)
        .put("/v1/workflows/wf-1/run", { recipients: ["u1"] })
        .query({ environment: "development" })
        .reply(200, { ok: true });
    })
    .command([
      "mapi",
      "/v1/workflows/wf-1/run",
      "-F",
      "environment=development",
      "-F",
      'recipients=["u1"]',
    ])
    .it("runs workflow with path template and body", (ctx) => {
      expect(ctx.stdout).to.contain("ok");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app")
        .get("/v1/openapi")
        .reply(200, spec)
        .get("/v1/workflows")
        .query({ environment: "development" })
        .reply(200, {
          entries: [{ key: "a" }],
          page_info: { after: "c1", page_size: 1 },
          total_count: 99,
        })
        .get("/v1/workflows")
        .query({ environment: "development", after: "c1" })
        .reply(200, {
          entries: [{ key: "b" }],
          page_info: {},
        });
    })
    .command([
      "mapi",
      "/v1/workflows",
      "--paginate",
      "-F",
      "environment=development",
    ])
    .it("paginates list workflows", (ctx) => {
      expect(ctx.stdout).to.contain("a");
      expect(ctx.stdout).to.contain("b");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app")
        .get("/v1/openapi")
        .reply(200, spec)
        .get("/v1/workflows")
        .query({ environment: "development" })
        .reply(200, {
          entries: [{ key: "a" }],
          page_info: { after: "c1", page_size: 1 },
          total_count: 99,
        })
        .get("/v1/workflows")
        .query({ environment: "development", after: "c1" })
        .reply(200, {
          entries: [{ key: "b" }],
          page_info: {},
        });
    })
    .command([
      "mapi",
      "/v1/workflows",
      "--paginate",
      "--json",
      "-F",
      "environment=development",
    ])
    .it("paginate merge keeps first-page metadata in --json output", (ctx) => {
      expect(ctx.stdout).to.contain('"total_count": 99');
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app").get("/v1/openapi").reply(200, spec);
    })
    .command(["mapi", "/v1/whoami", "--generate", "curl"])
    .it("prints curl command with token placeholder", (ctx) => {
      expect(ctx.stdout).to.contain("curl");
      expect(ctx.stdout).to.contain("Bearer $KNOCK_SERVICE_TOKEN");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app").get("/v1/openapi").reply(200, spec);
    })
    .command([
      "mapi",
      "/v1/whoami",
      "--generate",
      "curl",
      "-H",
      "Authorization: Bearer custom",
    ])
    .it(
      "generate curl omits token placeholder when Authorization is set",
      (ctx) => {
        expect(ctx.stdout).to.contain("Bearer custom");
        expect(ctx.stdout).to.not.contain("$KNOCK_SERVICE_TOKEN");
      },
    );

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stderr()
    .stdout()
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app")
        .get("/v1/openapi")
        .reply(200, spec)
        .get("/v1/whoami")
        .query({ a: "2" })
        .reply(200, { ok: true });
    })
    .command(["mapi", "/v1/whoami", "-F", "a=1", "-F", "a=2"])
    .it("warns on duplicate -F keys", (ctx) => {
      expect(ctx.stderr).to.contain("Warning:");
      expect(ctx.stderr).to.contain('Duplicate field key "a"');
      expect(ctx.stdout).to.contain("ok");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app")
        .get("/v1/openapi")
        .reply(200, spec)
        .delete("/v1/resource/r1")
        .reply(204);
    })
    .command([
      "mapi",
      "deleteResource",
      "-F",
      "id=r1",
      "--dangerously-skip-permissions",
    ])
    .it("sends DELETE without prompt", () => {
      expect(nock.isDone()).to.equal(true);
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app")
        .get("/v1/openapi")
        .reply(200, spec)
        .get("/v1/whoami")
        .reply(404, { error: "not found" });
    })
    .stdout()
    .command(["mapi", "/v1/whoami", "--json"])
    .it("exits 1 when HTTP error with --json", (ctx) => {
      // oclif swallows `ExitError` when --json is set and sets `process.exitCode`
      // instead of rejecting `runCommand`, so `.exit(1)` from @oclif/test does not apply.
      expect(process.exitCode).to.equal(1);
      expect(ctx.stdout).to.contain("not found");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app")
        .get("/v1/openapi")
        .reply(200, spec)
        .get("/v1/whoami")
        .reply(404, { error: "not found" });
    })
    .stdout()
    .command(["mapi", "/v1/whoami"])
    .exit(1)
    .it("exits 1 when HTTP error without --json", (ctx) => {
      expect(ctx.stdout).to.contain("not found");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app").get("/v1/openapi").reply(200, spec);
    })
    .command(["mapi", "/v1/ambiguous-methods"])
    .catch((error: Error) => {
      expect(error.message).to.match(/Ambiguous endpoint/);
    })
    .it("errors when path matches multiple methods without -X");
});
