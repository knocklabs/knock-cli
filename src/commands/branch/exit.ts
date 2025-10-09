import * as fs from "fs-extra";

import BaseCommand from "@/lib/base-command";
import { BRANCH_FILE_NAME } from "@/lib/helpers/branch";
import { findFile } from "@/lib/helpers/fs";

export default class BranchExit extends BaseCommand<typeof BranchExit> {
  // Hide until branches are released in GA
  static hidden = true;

  static summary = "Exits the current branch.";

  async run(): Promise<void> {
    const currDir = process.cwd();
    const branchFilePath = await findFile(currDir, BRANCH_FILE_NAME);

    if (!branchFilePath) {
      this.log("‣ No branch is currently active, skipping exit");
      return;
    }

    await fs.remove(branchFilePath);

    this.log("‣ Successfully exited the branch");
  }
}
