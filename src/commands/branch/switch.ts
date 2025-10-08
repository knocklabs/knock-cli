import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { CustomArgs } from "@/lib/helpers/arg";
import {
  BRANCH_FILE_NAME,
  updateCurrentBranchFile,
} from "@/lib/helpers/branch";
import { findFile } from "@/lib/helpers/fs";
import { withSpinnerV2 } from "@/lib/helpers/request";

export default class BranchSwitch extends BaseCommand<typeof BranchSwitch> {
  // Hide until branches are released in GA
  static hidden = true;

  static summary = "Switches to an existing branch with the given slug.";

  static args = {
    slug: CustomArgs.slug({
      required: true,
      description: "The slug of the branch to switch to",
    }),
  };

  async run(): Promise<void> {
    const { args } = this.props;

    const currDir = process.cwd();
    const branchFilePath = await findFile(currDir, BRANCH_FILE_NAME);

    if (!branchFilePath) {
      this.log(`‣ Cannot locate ${BRANCH_FILE_NAME} file, skipping switch`);
      return;
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
