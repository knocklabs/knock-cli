import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();

describe("commands/variable/new", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .command([
      "variable new",
      "--key",
      "app_name",
      "--type",
      "public",
      "--value",
      "Acme",
      "--description",
      "Product name",
      "--force",
    ])
    .it("adds an entry to variables.json", () => {
      const written = fs.readJsonSync(path.join(sandboxDir, "variables.json"));
      expect(written).to.eql({
        app_name: {
          type: "public",
          description: "Product name",
          value: "Acme",
        },
      });
    });

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .do(() => {
      fs.writeJsonSync(path.join(sandboxDir, "variables.json"), {
        app_name: { type: "public", value: "Acme" },
      });
    })
    .command([
      "variable new",
      "--key",
      "app_name",
      "--type",
      "public",
      "--value",
      "Other",
      "--force",
    ])
    .catch(/already in/)
    .it("does not overwrite an existing entry");

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stdout()
    .command([
      "variable new",
      "--key",
      "stripe_api_key",
      "--type",
      "secret",
      "--value",
      "sk_live_super_secret",
      "--force",
    ])
    .catch(/Refusing to write a secret/)
    .it("does not accept a secret value flag");
});
