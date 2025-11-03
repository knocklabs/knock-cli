import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();

describe("commands/init", () => {
  before(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  beforeEach(() => {
    process.chdir(sandboxDir);
    // Clean up knock.json before each test
    const configPath = path.resolve(sandboxDir, "knock.json");
    fs.removeSync(configPath);
  });
  after(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("when knock.json already exists", () => {
    test
      .stdout()
      .do(() => {
        const configPath = path.resolve(sandboxDir, "knock.json");
        fs.writeJsonSync(configPath, { knockDir: ".knock" });
      })
      .command(["init"])
      .catch((error) =>
        expect(error.message).to.match(
          /A knock.json file already exists in this directory/,
        ),
      )
      .it("throws an error and aborts");
  });

  describe("when knock.json does not exist", () => {
    test
      .stdout()
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ knockDir: ".knock" }),
      )
      .command(["init"])
      .it("creates knock.json and the knock directory", (ctx) => {
        const configPath = path.resolve(sandboxDir, "knock.json");
        const knockDirPath = path.resolve(sandboxDir, ".knock");

        // Verify knock.json was created
        expect(fs.pathExistsSync(configPath)).to.equal(true);

        // Verify the content of knock.json
        const config = fs.readJsonSync(configPath);
        expect(config).to.deep.equal({
          $schema: "https://schemas.knock.app/cli/knock.json",
          knockDir: ".knock",
        });

        // Verify the knock directory was created
        expect(fs.pathExistsSync(knockDirPath)).to.equal(true);

        // Verify resource subdirectories and .gitignore files were created
        const resourceDirs = [
          "workflows",
          "layouts",
          "message-types",
          "partials",
          "guides",
          "translations",
        ];

        for (const resourceDir of resourceDirs) {
          const resourceDirPath = path.resolve(knockDirPath, resourceDir);
          const gitignorePath = path.resolve(resourceDirPath, ".gitignore");

          expect(fs.pathExistsSync(resourceDirPath)).to.equal(true);
          expect(fs.pathExistsSync(gitignorePath)).to.equal(true);
        }

        // Verify the success messages
        expect(ctx.stdout).to.contain("Successfully initialized Knock project");
        expect(ctx.stdout).to.contain("Resources directory: .knock");
      });
  });

  describe("when user specifies a custom directory", () => {
    test
      .stdout()
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ knockDir: "custom-knock-dir" }),
      )
      .command(["init"])
      .it("creates knock.json with the custom directory", (ctx) => {
        const configPath = path.resolve(sandboxDir, "knock.json");
        const knockDirPath = path.resolve(sandboxDir, "custom-knock-dir");

        // Verify knock.json was created with custom directory
        const config = fs.readJsonSync(configPath);
        expect(config).to.deep.equal({
          $schema: "https://schemas.knock.app/cli/knock.json",
          knockDir: "custom-knock-dir",
        });

        // Verify the custom knock directory was created
        expect(fs.pathExistsSync(knockDirPath)).to.equal(true);

        // Verify resource subdirectories and .gitignore files were created
        const resourceDirs = [
          "workflows",
          "layouts",
          "message-types",
          "partials",
          "guides",
          "translations",
        ];

        for (const resourceDir of resourceDirs) {
          const resourceDirPath = path.resolve(knockDirPath, resourceDir);
          const gitignorePath = path.resolve(resourceDirPath, ".gitignore");

          expect(fs.pathExistsSync(resourceDirPath)).to.equal(true);
          expect(fs.pathExistsSync(gitignorePath)).to.equal(true);
        }

        // Verify the success messages
        expect(ctx.stdout).to.contain("Successfully initialized Knock project");
        expect(ctx.stdout).to.contain("Resources directory: custom-knock-dir");
      });
  });
});
