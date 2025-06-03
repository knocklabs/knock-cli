import { test } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();

describe("commands/pull", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  // describe("given a valid service token via flag", () => {
  //   test
  //     .stdout()
  //     .command(["pull", "--service-token", "valid-token"])
  //     .it("runs the command", (ctx) => {
  //       expect(ctx.stdout).to.contain("TODO");
  //     });
  // });

  // describe("given a valid service token via env var", () => {
  //   test
  //     .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
  //     .stdout()
  //     .command(["pull"])
  //     .it("runs the command", (ctx) => {
  //       expect(ctx.stdout).to.contain("TODO");
  //     });
  // });

  describe("given no service token flag", () => {
    test.command(["pull"]).exit(2).it("exits with status 2");
  });
});
