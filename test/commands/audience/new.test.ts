import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import { AUDIENCE_JSON } from "@/lib/marshal/audience";

const currCwd = process.cwd();

describe("commands/audience/new", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given all flags provided for static audience", () => {
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
        "audience new",
        "--name",
        "VIP Users",
        "--key",
        "vip-users",
        "--type",
        "static",
        "--force",
      ])
      .it("creates the audience directory with static audience.json", () => {
        const audienceJsonPath = path.resolve(
          sandboxDir,
          "vip-users",
          AUDIENCE_JSON,
        );
        expect(fs.existsSync(audienceJsonPath)).to.be.true;

        const audienceJson = fs.readJsonSync(audienceJsonPath);
        expect(audienceJson.name).to.equal("VIP Users");
        expect(audienceJson.type).to.equal("static");
        expect(audienceJson.segments).to.be.undefined;
      });
  });

  describe("given all flags provided for dynamic audience", () => {
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
        "audience new",
        "--name",
        "Beta Testers",
        "--key",
        "beta-testers",
        "--type",
        "dynamic",
        "--description",
        "Users in beta program",
        "--force",
      ])
      .it("creates the audience directory with dynamic audience.json", () => {
        const audienceJsonPath = path.resolve(
          sandboxDir,
          "beta-testers",
          AUDIENCE_JSON,
        );
        expect(fs.existsSync(audienceJsonPath)).to.be.true;

        const audienceJson = fs.readJsonSync(audienceJsonPath);
        expect(audienceJson.name).to.equal("Beta Testers");
        expect(audienceJson.type).to.equal("dynamic");
        expect(audienceJson.description).to.equal("Users in beta program");
      });
  });

  describe("given an invalid audience key", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command([
        "audience new",
        "--name",
        "Invalid Audience",
        "--key",
        "INVALID_KEY",
        "--type",
        "static",
        "--force",
      ])
      .catch((error) => expect(error.message).to.match(/Invalid audience key/))
      .it("throws an error for invalid key format");
  });

  describe("given inside an existing resource directory", () => {
    beforeEach(() => {
      // Create an existing workflow directory
      const workflowJsonPath = path.resolve(
        sandboxDir,
        "my-workflow",
        "workflow.json",
      );
      fs.outputJsonSync(workflowJsonPath, { name: "My Workflow" });

      process.chdir(path.resolve(sandboxDir, "my-workflow"));
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command([
        "audience new",
        "--name",
        "Test",
        "--key",
        "test",
        "--type",
        "static",
        "--force",
      ])
      .catch((error) =>
        expect(error.message).to.match(
          /Cannot create a new audience inside an existing/,
        ),
      )
      .it("throws an error");
  });
});
