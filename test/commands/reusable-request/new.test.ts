import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import { REUSABLE_REQUEST_JSON } from "@/lib/marshal/reusable-request";

const currCwd = process.cwd();

describe("commands/reusable-request/new", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given the required flags", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: true }),
      )
      .stdout()
      .command([
        "reusable-request new",
        "--name",
        "Fetch user",
        "--key",
        "fetch-user",
        "--description",
        "Loads a user from the API.",
        "--method",
        "post",
        "--url",
        "https://example.com/users",
        "--force",
      ])
      .it("creates reusable_request.json", () => {
        const jsonPath = path.resolve(
          sandboxDir,
          "fetch-user",
          REUSABLE_REQUEST_JSON,
        );
        expect(fs.existsSync(jsonPath)).to.equal(true);

        const reusableRequestJson = fs.readJsonSync(jsonPath);
        expect(reusableRequestJson.name).to.equal("Fetch user");
        expect(reusableRequestJson.type).to.equal("http_fetch");
        expect(reusableRequestJson.description).to.equal(
          "Loads a user from the API.",
        );
        expect(reusableRequestJson.settings).to.deep.equal({
          method: "post",
          url: "https://example.com/users",
        });
        expect(reusableRequestJson.key).to.equal(undefined);
      });
  });

  describe("given an invalid key", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command([
        "reusable-request new",
        "--name",
        "Fetch user",
        "--key",
        "ab",
        "--force",
      ])
      .catch(/Invalid reusable request key/)
      .it("rejects keys that do not match the spec");
  });

  describe("given --json", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command([
        "reusable-request new",
        "--name",
        "Fetch user",
        "--key",
        "fetch-user",
        "--force",
        "--json",
      ])
      .it("prints the scaffold", (ctx) => {
        const parsed = JSON.parse(ctx.stdout);
        expect(parsed.key).to.equal("fetch-user");
        expect(parsed.type).to.equal("http_fetch");
        expect(parsed.settings.method).to.equal("get");
        expect(parsed.settings.url).to.equal("https://example.com");
      });
  });
});
