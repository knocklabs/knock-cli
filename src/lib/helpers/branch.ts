import { execSync } from "node:child_process";
import * as path from "node:path";

import * as fs from "fs-extra";

/**
 * The name of the file used to store the current branch.
 * This file is stored as plain text and contains the slug of the current branch
 * followed by a newline.
 */
export const BRANCH_FILE_NAME = ".knock_branch";

export const hasCurrentBranchFile = async (
  currDir: string,
): Promise<boolean> => {
  const currentBranchFilePath = path.resolve(currDir, BRANCH_FILE_NAME);
  return fs.pathExists(currentBranchFilePath);
};

export const updateCurrentBranchFile = async (
  branchFilePath: string,
  branchSlug: string,
): Promise<void> => {
  await fs.writeFile(branchFilePath, `${branchSlug}\n`);
};

export const parseSlugFromBranchFile = async (
  branchFilePath: string,
): Promise<string | undefined> => {
  const slug = await fs.readFile(branchFilePath, "utf-8");
  return slug.split("\n")[0];
};

export const isBranchFileIgnoredByGit = async (
  gitIgnoreFilePath: string,
): Promise<boolean> => {
  const { dirname } = path;

  try {
    const output = execSync(`git check-ignore ${BRANCH_FILE_NAME}`, {
      cwd: dirname(gitIgnoreFilePath),
      encoding: "utf-8",
    });
    return output.trim() === BRANCH_FILE_NAME;
  } catch {
    return false;
  }
};
