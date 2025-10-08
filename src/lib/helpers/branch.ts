import * as path from "node:path";

import * as fs from "fs-extra";

export const hasCurrentBranchFile = async (
  currDir: string,
): Promise<boolean> => {
  const currentBranchFilePath = path.resolve(currDir, ".knock_current_branch");
  return fs.pathExists(currentBranchFilePath);
};

export const updateCurrentBranchFile = async (
  branchFilePath: string,
  branchSlug: string,
): Promise<void> => {
  await fs.writeFile(branchFilePath, `${branchSlug}\n`);
};
