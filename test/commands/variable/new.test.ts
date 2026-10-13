import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import VariablePush from "@/commands/variable/push";
import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();

describe("commands/variable/new", () => {
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
    .stdout()
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
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
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
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
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
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

  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(VariablePush, "run", (stub) => stub.resolves())
    .loadConfig()
    .do(() => process.chdir(sandboxDir))
    .command([
      "variable new",
      "--key",
      "stripe_api_key",
      "--type",
      "secret",
      "--force",
      "--push",
      "--api-origin",
      "https://example.test",
      "--service-token",
      "flag-token",
    ])
    .it("forwards the API origin to push and still asks before pushing", () => {
      const args = (VariablePush.run as sinon.SinonStub).firstCall
        .args[0] as string[];
      expect(args).to.include("--api-origin");
      expect(args).to.include("https://example.test");
      expect(args).to.include("--service-token");
      expect(args).to.include("flag-token");
      expect(args).to.not.include("--force");
    });
});
