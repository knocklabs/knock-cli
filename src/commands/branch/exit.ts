import findUp from "find-up";

import BaseCommand from "@/lib/base-command";
import { BRANCH_FILE_NAME, clearBranchFile } from "@/lib/helpers/branch";

export default class BranchExit extends BaseCommand<typeof BranchExit> {
  // Hide until branches are released in GA
  static hidden = true;

  static summary = "Exits the current branch.";

  async run(): Promise<void> {
    const branchFilePath = await findUp(BRANCH_FILE_NAME);

    if (!branchFilePath) {
      throw new Error(
        `No ${BRANCH_FILE_NAME} file found. Run \`knock branch switch\` to start working on a branch.`,
      );
    }

    await clearBranchFile(branchFilePath);

    this.log("‣ Successfully exited the branch");
  }
}
