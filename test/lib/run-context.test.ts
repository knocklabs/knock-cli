import * as path from "node:path";

import { expect } from "@oclif/test";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/env";
import { load } from "@/lib/run-context";

const files = ["a/b/workflow.json", "a/b/c/foo.txt"];
const currCwd = process.cwd();

describe("lib/run-context", () => {
  describe("load", () => {
    before(() => {
      fs.removeSync(sandboxDir);

      for (const relpath of files) {
        const abspath = path.join(sandboxDir, relpath);
        fs.ensureFileSync(abspath);
      }
    });
    after(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    describe("given a cwd of a/", () => {
      it("resolves a run context w/o a workflow directory", async () => {
        const newCwd = path.resolve(sandboxDir, "a");
        process.chdir(newCwd);

        expect(await load()).to.eql({ cwd: newCwd });
      });
    });

    describe("given a cwd of b/", () => {
      it("resolves a run context with a workflow directory `b`", async () => {
        const newCwd = path.resolve(sandboxDir, "a", "b");
        process.chdir(newCwd);

        expect(await load()).to.eql({
          cwd: newCwd,
          resourceDir: {
            type: "workflow",
            key: "b",
            abspath: path.resolve(sandboxDir, "a", "b"),
            exists: true,
          },
        });
      });
    });

    describe("given a cwd of c/", () => {
      it("resolves a run context without a workflow directory `b`", async () => {
        const newCwd = path.resolve(sandboxDir, "a", "b", "c");
        process.chdir(newCwd);

        expect(await load()).to.eql({
          cwd: newCwd,
          resourceDir: {
            type: "workflow",
            key: "b",
            abspath: path.resolve(sandboxDir, "a", "b"),
            exists: true,
          },
        });
      });
    });
  });
});
