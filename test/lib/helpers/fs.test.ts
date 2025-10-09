import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import { findFile, isDirectory } from "@/lib/helpers/fs";

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

  describe("findFile", () => {
    beforeEach(() => {
      fs.removeSync(sandboxDir);
      fs.ensureDirSync(sandboxDir);
    });

    afterEach(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    it("returns file's path when file is present in the current directory", async () => {
      const expectedFilePath = path.resolve(sandboxDir, "foo.txt");
      fs.ensureFileSync(expectedFilePath);

      const actualFilePath = await findFile(sandboxDir, "foo.txt");

      expect(actualFilePath).to.equal(expectedFilePath);
    });

    it("returns file's path when file is present in an ancestor directory", async () => {
      const expectedFilePath = path.resolve(sandboxDir, "foo.txt");
      fs.ensureFileSync(expectedFilePath);

      const currDir = path.resolve(sandboxDir, "a", "b");
      const actualFilePath = await findFile(currDir, "foo.txt");

      expect(actualFilePath).to.equal(expectedFilePath);
    });

    it("returns undefined when the file is not found", async () => {
      const actualFilePath = await findFile(sandboxDir, "foo.txt");
      expect(actualFilePath).to.equal(undefined);
    });
  });
});
