import * as path from "node:path";

import { expect } from "chai";
import * as fs from "fs-extra";

import { BRANCH_FILE_NAME, hasCurrentBranchFile } from "@/lib/helpers/branch";
import { sandboxDir } from "@/lib/helpers/const";

describe("lib/helpers/branch", () => {
  describe("hasCurrentBranchFile", () => {
    describe("when a branch file exists", () => {
      beforeEach(() => {
        const branchFilePath = path.resolve(sandboxDir, BRANCH_FILE_NAME);
        fs.ensureFileSync(branchFilePath);
        process.chdir(sandboxDir);
      });

      afterEach(() => {
        fs.removeSync(sandboxDir);
      });

      it("returns true", async () => {
        const result = await hasCurrentBranchFile(sandboxDir);
        expect(result).to.equal(true);
      });
    });

    describe("when a branch file does not exist", () => {
      it("returns false", async () => {
        const result = await hasCurrentBranchFile(sandboxDir);
        expect(result).to.equal(false);
      });
    });
  });
});
