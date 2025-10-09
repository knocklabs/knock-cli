import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";

import { BRANCH_FILE_NAME } from "@/lib/helpers/branch";
import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();
const branchFilePath = path.resolve(sandboxDir, BRANCH_FILE_NAME);

describe("commands/branch/exit", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a branch file exists", () => {
    beforeEach(() => {
      fs.ensureFileSync(branchFilePath);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["branch exit"])
      .it("displays a message and deletes the branch file", (ctx) => {
        expect(ctx.stdout).to.contain("‣ Successfully exited the branch");
        expect(fs.existsSync(branchFilePath)).to.equal(false);
      });
  });

  describe("given a branch file does not exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["branch exit"])
      .it("displays a message and exits", (ctx) => {
        expect(ctx.stdout).to.contain(
          "‣ No branch is currently active, skipping exit",
        );
      });
  });

  describe("given no service token", () => {
    test.command(["branch exit"]).exit(2).it("exits with status 2");
  });
});
