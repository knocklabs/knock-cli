import path from "node:path";

import * as fs from "fs-extra";

import { findFile } from "./fs";

/**
 * The name of the file used to store the current branch.
 * This file is stored as plain text and contains either:
 * 1. The slug of the current branch followed by a newline, or
 * 2. An empty string if no branch is currently active
 */
export const BRANCH_FILE_NAME = ".knock_branch";

export const readSlugFromBranchFile = async (): Promise<string | undefined> => {
  const currDir = process.cwd();
  const branchFilePath = await findFile(currDir, BRANCH_FILE_NAME);

  const slug = branchFilePath
    ? await parseSlugFromBranchFile(branchFilePath)
    : undefined;

  return slug;
};

export const parseSlugFromBranchFile = async (
  branchFilePath: string,
): Promise<string | undefined> => {
  const input = (await fs.readFile(branchFilePath, "utf-8")).trim();
  return /^[\w-]+$/.test(input) ? input : undefined;
};

export const clearBranchFile = async (
  branchFilePath: string,
): Promise<void> => {
  // The empty string indicates that no branch is currently active
  await fs.writeFile(branchFilePath, "");
};

export const writeSlugToBranchFile = async (
  branchFilePath: string,
  branchSlug: string,
): Promise<void> => {
  await fs.writeFile(branchFilePath, `${branchSlug}\n`);
};

/**
 * Finds the "project root" directory, a best guess at the top-level directory
 * for the current project. We always look for an ancestor directory containing
 * a `.gitignore` file. If no `.gitignore` file is found, we return the current
 * directory.
 *
 * @returns the path to the project root directory
 */
export const findProjectRoot = async (): Promise<string> => {
  const currDir = process.cwd();
  const gitIgnoreFilePath = await findFile(currDir, ".gitignore");
  return gitIgnoreFilePath ? path.dirname(gitIgnoreFilePath) : currDir;
};
