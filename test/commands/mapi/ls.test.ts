import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import nock from "nock";

const openApiFixturePath = path.resolve(
  __dirname,
  "../../support/fixtures/mapi-openapi.json",
);

describe("commands/mapi/ls", () => {
  afterEach(() => {
    nock.cleanAll();
  });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app").get("/v1/openapi").reply(200, spec);
    })
    .command(["mapi:ls", "--format", "json"])
    .it("prints operations as JSON", (ctx) => {
      expect(ctx.stdout).to.contain("getWhoami");
      expect(ctx.stdout).to.contain("/v1/whoami");
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .do(async () => {
      const spec = await fs.readJSON(openApiFixturePath);
      nock("https://control.knock.app").get("/v1/openapi").reply(200, spec);
    })
    .command(["mapi:ls", "--tag", "Accounts"])
    .it("filters by tag", (ctx) => {
      expect(ctx.stdout).to.contain("Accounts");
      expect(ctx.stdout).to.contain("whoami");
    });
});
