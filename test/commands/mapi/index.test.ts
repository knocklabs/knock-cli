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
      nock("https://control.knock.app").get("/v1/openapi").reply(200, spec);
    })
    .command(["mapi", "/v1/whoami", "--generate", "curl"])
    .it("prints curl command with token placeholder", (ctx) => {
      expect(ctx.stdout).to.contain("curl");
      expect(ctx.stdout).to.contain("Bearer $KNOCK_SERVICE_TOKEN");
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
});
