import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import { isDirectory } from "@/lib/helpers/fs";

const currCwd = process.cwd();

describe("lib/helpers/fs", () => {
  describe("isDirectory", () => {
    beforeEach(() => {
      fs.removeSync(sandboxDir);
      fs.ensureDirSync(sandboxDir);
    });
    afterEach(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("given a nonexistent path", () => {
      it("returns false", async () => {
        const abspath = path.resolve(sandboxDir, "foo");

        expect(await isDirectory(abspath)).to.equal(false);
      });
    });

    describe("given a path to a file", () => {
      it("returns false", async () => {
        const abspath = path.resolve(sandboxDir, "foo");
        fs.ensureFileSync(abspath);

        expect(await isDirectory(abspath)).to.equal(false);
      });
    });

    describe("given a path to a directory", () => {
      it("returns false", async () => {
        const abspath = path.resolve(sandboxDir, "foo");
        fs.ensureDirSync(abspath);

        expect(await isDirectory(abspath)).to.equal(true);
      });
    });
  });
});
