import * as path from "node:path";

import { Flags } from "@oclif/core";
import * as fs from "fs-extra";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { CustomArgs } from "@/lib/helpers/arg";
import {
  BRANCH_FILE_NAME,
  findFile,
  updateCurrentBranchFile,
} from "@/lib/helpers/branch";
import { withSpinnerV2 } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class BranchSwitch extends BaseCommand<typeof BranchSwitch> {
  // Hide until branches are released in GA
  static hidden = true;

  static summary = "Switches to an existing branch with the given slug.";

  static flags = {
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  static args = {
    slug: CustomArgs.slug({
      required: true,
      description: "The slug of the branch to switch to",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    const currDir = process.cwd();
    let branchFilePath = await findFile(currDir, BRANCH_FILE_NAME);

    if (!branchFilePath) {
      const gitIgnoreFilePath = await findFile(currDir, ".gitignore");
      if (!gitIgnoreFilePath) {
        this.log(`‣ Cannot locate ${BRANCH_FILE_NAME} file, skipping switch`);
        return;
      }

      const dirPath = gitIgnoreFilePath.replace("/.gitignore", "");
      const prompt = `Create a new ${BRANCH_FILE_NAME} file at ${dirPath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;

      branchFilePath = path.resolve(dirPath, BRANCH_FILE_NAME);
      await fs.ensureFile(branchFilePath);
    }

    this.log(`‣ Switching to branch \`${args.slug}\``);

    // Fetch the branch to make sure it exists
    const branch = await withSpinnerV2<ApiV1.BranchData>(() =>
      this.apiV1.mgmtClient.get(`/v1/branches/${args.slug}`),
    );

    await updateCurrentBranchFile(branchFilePath, branch.slug);

    this.log(`‣ Successfully switched to branch \`${branch.slug}\``);
  }
}
