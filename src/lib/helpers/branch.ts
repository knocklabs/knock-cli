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

/**
 * Finds the branch file by recursively walking up the directory tree starting
 * from the given directory.
 * @param currDir the directory to start searching from
 * @returns the path to the branch file, or `undefined` if no branch file is found
 */
export const findCurrentBranchFile = async (
  currDir: string,
): Promise<string | undefined> => {
  const branchFilePath = path.resolve(currDir, BRANCH_FILE_NAME);
  const fileExists = await fs.pathExists(branchFilePath);

  if (fileExists) {
    return branchFilePath;
  }

  // If we reached the root of the filesystem, nothing more to do
  const { root } = path.parse(currDir);
  if (currDir === root) {
    return undefined;
  }

  // Keep walking up the directory tree
  const parentDir = path.resolve(currDir, "..");
  return findCurrentBranchFile(parentDir);
};
