import path from "node:path";

import { expect } from "chai";
import * as fs from "fs-extra";

import {
  BRANCH_FILE_NAME,
  parseSlugFromBranchFile,
  readSlugFromBranchFile,
  writeSlugToBranchFile,
} from "@/lib/helpers/branch";
import { sandboxDir } from "@/lib/helpers/const";

const branchFilePath = path.resolve(sandboxDir, BRANCH_FILE_NAME);

describe("lib/helpers/branch", () => {
  describe("readSlugFromBranchFile", () => {
    beforeEach(() => {
      fs.ensureDirSync(sandboxDir);
      process.chdir(sandboxDir);
    });

    afterEach(() => {
      fs.removeSync(sandboxDir);
    });

    it("returns slug when branch file is found in correct directory and formatted correctly", async () => {
      fs.writeFileSync(branchFilePath, "my-feature-branch-123\n");
      const actualSlug = await readSlugFromBranchFile();
      expect(actualSlug).to.equal("my-feature-branch-123");
    });

    it("returns undefined when branch file is found but is formatted incorrectly", async () => {
      // Write nothing but whitespace
      fs.writeFileSync(branchFilePath, "   ");
      const actualSlug = await readSlugFromBranchFile();
      expect(actualSlug).to.equal(undefined);
    });

    it("returns undefined when branch file is not found", async () => {
      const actualSlug = await readSlugFromBranchFile();
      expect(actualSlug).to.equal(undefined);
    });
  });

  describe("parseSlugFromBranchFile", () => {
    beforeEach(() => {
      fs.ensureDirSync(sandboxDir);
      process.chdir(sandboxDir);
      fs.ensureFileSync(branchFilePath);
    });

    afterEach(() => {
      fs.removeSync(sandboxDir);
    });

    describe("when the branch file exists and is formatted correctly (with a newline)", () => {
      beforeEach(async () => {
        fs.writeFileSync(branchFilePath, "my-feature-branch-123\n");
      });

      it("returns the slug", async () => {
        const result = await parseSlugFromBranchFile(branchFilePath);
        expect(result).to.equal("my-feature-branch-123");
      });
    });

    describe("when the branch file exists and is formatted correctly (no newline)", () => {
      beforeEach(async () => {
        fs.writeFileSync(branchFilePath, "my-feature-branch-123");
      });

      it("returns the slug", async () => {
        const result = await parseSlugFromBranchFile(branchFilePath);
        expect(result).to.equal("my-feature-branch-123");
      });
    });

    describe("when the branch file exists but is formatted incorrectly", () => {
      beforeEach(async () => {
        // Write nothing but whitespace
        fs.writeFileSync(branchFilePath, "   ");
      });

      it("returns undefined", async () => {
        const result = await parseSlugFromBranchFile(branchFilePath);
        expect(result).to.be.undefined;
      });
    });
  });

  describe("writeSlugToBranchFile", () => {
    beforeEach(() => {
      fs.ensureDirSync(sandboxDir);
      process.chdir(sandboxDir);
      fs.ensureFileSync(branchFilePath);
    });

    afterEach(() => {
      fs.removeSync(sandboxDir);
    });

    it("writes the branch slug to the file with a newline", async () => {
      const branchSlug = "my-feature-branch-123";

      await writeSlugToBranchFile(branchFilePath, branchSlug);

      const content = fs.readFileSync(branchFilePath, "utf-8");
      expect(content).to.equal(`${branchSlug}\n`);
    });
  });
});
