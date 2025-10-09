import * as fs from "fs-extra";

import { findFile } from "./fs";

/**
 * The name of the file used to store the current branch.
 * This file is stored as plain text and contains the slug of the current branch
 * followed by a newline.
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

export const writeSlugToBranchFile = async (
  branchFilePath: string,
  branchSlug: string,
): Promise<void> => {
  await fs.writeFile(branchFilePath, `${branchSlug}\n`);
};
