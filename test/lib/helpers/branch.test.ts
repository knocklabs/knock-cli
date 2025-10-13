import path from "node:path";

import { expect } from "chai";
import * as fs from "fs-extra";

import {
  BRANCH_FILE_NAME,
  clearBranchFile,
  findProjectRoot,
  parseSlugFromBranchFile,
  readSlugFromBranchFile,
  writeSlugToBranchFile,
} from "@/lib/helpers/branch";
import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();
const branchFilePath = path.resolve(sandboxDir, BRANCH_FILE_NAME);

describe("lib/helpers/branch", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("readSlugFromBranchFile", () => {
    it("returns slug when correctly formatted branch file is found in current directory", async () => {
      fs.writeFileSync(branchFilePath, "my-feature-branch-123\n");
      const actualSlug = await readSlugFromBranchFile();
      expect(actualSlug).to.equal("my-feature-branch-123");
    });

    it("returns slug when correctly formatted branch file is found in ancestor directory", async () => {
      fs.writeFileSync(branchFilePath, "my-feature-branch-123\n");
      const descendantDir = path.resolve(sandboxDir, "a", "b");
      fs.ensureDirSync(descendantDir);
      process.chdir(descendantDir);

      const actualSlug = await readSlugFromBranchFile();

      expect(actualSlug).to.equal("my-feature-branch-123");
    });

    it("returns undefined when empty branch file is found", async () => {
      fs.writeFileSync(branchFilePath, "");
      const actualSlug = await readSlugFromBranchFile();
      expect(actualSlug).to.equal(undefined);
    });

    it("returns undefined when branch file is found but is formatted incorrectly", async () => {
      // Write nothing but whitespace
      fs.writeFileSync(branchFilePath, "   \t\n");
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
      fs.ensureFileSync(branchFilePath);
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

    describe("when the branch file exists but is empty", () => {
      beforeEach(async () => {
        fs.writeFileSync(branchFilePath, "");
      });

      it("returns undefined", async () => {
        const result = await parseSlugFromBranchFile(branchFilePath);
        expect(result).to.be.undefined;
      });
    });

    describe("when the branch file exists but is formatted incorrectly", () => {
      beforeEach(async () => {
        // Write nothing but whitespace
        fs.writeFileSync(branchFilePath, "   \t\n");
      });

      it("returns undefined", async () => {
        const result = await parseSlugFromBranchFile(branchFilePath);
        expect(result).to.be.undefined;
      });
    });
  });

  describe("clearBranchFile", () => {
    it("writes the empty string to the given file", async () => {
      await fs.writeFile(branchFilePath, "my-feature-branch-123\n");
      await clearBranchFile(branchFilePath);
      const content = fs.readFileSync(branchFilePath, "utf-8");
      expect(content).to.equal("");
    });
  });

  describe("writeSlugToBranchFile", () => {
    it("writes the branch slug to a new file", async () => {
      const branchSlug = "my-feature-branch-123";

      await writeSlugToBranchFile(branchFilePath, branchSlug);

      const content = fs.readFileSync(branchFilePath, "utf-8");
      expect(content).to.equal(`${branchSlug}\n`);
    });

    it("writes the branch slug to an existing file", async () => {
      await fs.writeFile(branchFilePath, "lorem-ipsum-dolor-sit\n");
      const branchSlug = "my-feature-branch-123";

      await writeSlugToBranchFile(branchFilePath, branchSlug);

      const content = fs.readFileSync(branchFilePath, "utf-8");
      expect(content).to.equal(`${branchSlug}\n`);
      expect(content).to.not.equal("lorem-ipsum-dolor-sit\n");
    });
  });

  describe("findProjectRoot", () => {
    it("returns the current directory when no .gitignore file is found", async () => {
      const projectRoot = await findProjectRoot();
      expect(projectRoot).to.equal(sandboxDir);
    });

    it("returns the current directory when a .gitignore file exists in the current directory", async () => {
      fs.ensureDirSync(path.resolve(sandboxDir, ".git"));
      fs.ensureFileSync(path.resolve(sandboxDir, ".gitignore"));

      const projectRoot = await findProjectRoot();

      expect(projectRoot).to.equal(sandboxDir);
    });

    it("returns an ancestor directory when a .gitignore file is found in an ancestor directory", async () => {
      fs.ensureDirSync(path.resolve(sandboxDir, ".git"));
      fs.ensureFileSync(path.resolve(sandboxDir, ".gitignore"));

      // Navigate to a descendant directory
      const currDir = path.resolve(sandboxDir, "a", "b");
      fs.ensureDirSync(currDir);
      process.chdir(currDir);

      const projectRoot = await findProjectRoot();
      expect(projectRoot).to.equal(sandboxDir);
    });

    it("stops searching when a .git directory is found", async () => {
      // Create a .gitignore file higher up than the .git directory
      fs.ensureDirSync(path.resolve(sandboxDir, "lorem", ".git"));
      fs.ensureFileSync(path.resolve(sandboxDir, ".gitignore"));

      // Navigate to a descendant directory
      const currDir = path.resolve(sandboxDir, "lorem", "ipsum");
      fs.ensureDirSync(currDir);
      process.chdir(currDir);

      // .gitignore is not found; we should return the current directory
      const projectRoot = await findProjectRoot();
      expect(projectRoot).to.not.equal(sandboxDir);
      expect(projectRoot).to.equal(currDir);
    });
  });
});
