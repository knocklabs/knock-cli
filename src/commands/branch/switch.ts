import * as path from "node:path";

import { Flags } from "@oclif/core";
import findUp from "find-up";
import * as fs from "fs-extra";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { CustomArgs } from "@/lib/helpers/arg";
import {
  appendBranchFileToGitIgnore,
  BRANCH_FILE_NAME,
  findProjectRoot,
  writeSlugToBranchFile,
} from "@/lib/helpers/branch";
import { isFileIgnoredByGit } from "@/lib/helpers/git";
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
    const { args } = this.props;

    const currDir = process.cwd();
    let branchFilePath = await findUp(BRANCH_FILE_NAME, { cwd: currDir });

    if (!branchFilePath) {
      const projectRoot = await findProjectRoot();

      branchFilePath = await this.promptToCreateBranchFile(projectRoot);

      // User declined to create the branch file
      if (!branchFilePath) return;

      const isBranchFileIgnoredByGit = await isFileIgnoredByGit(
        projectRoot,
        branchFilePath,
      );

      if (!isBranchFileIgnoredByGit) {
        await this.promptToUpdateGitIgnoreFile(projectRoot);
      }
    }

    await this.switchToBranch(branchFilePath, args.slug);
  }

  private async promptToCreateBranchFile(
    projectRoot: string,
  ): Promise<string | undefined> {
    const { flags } = this.props;

    const prompt = `Create \`${BRANCH_FILE_NAME}\` at ${projectRoot}?`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return undefined;

    return path.resolve(projectRoot, BRANCH_FILE_NAME);
  }

  private async promptToUpdateGitIgnoreFile(
    projectRoot: string,
  ): Promise<void> {
    const { flags } = this.props;

    const gitIgnoreFilePath = path.resolve(projectRoot, ".gitignore");
    const gitIgnoreFileExists = await fs.exists(gitIgnoreFilePath);

    const prompt = gitIgnoreFileExists
      ? `Update \`${gitIgnoreFilePath}\` to ignore \`${BRANCH_FILE_NAME}\`?`
      : `Create \`${gitIgnoreFilePath}\` to ignore \`${BRANCH_FILE_NAME}\`?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    await appendBranchFileToGitIgnore(gitIgnoreFilePath, gitIgnoreFileExists);
  }

  private async switchToBranch(
    branchFilePath: string,
    slug: string,
  ): Promise<void> {
    this.log(`‣ Switching to branch \`${slug}\``);

    // Fetch the branch to make sure it exists
    const branch = await withSpinnerV2<ApiV1.BranchData>(() =>
      this.apiV1.mgmtClient.get(`/v1/branches/${slug}`),
    );

    await writeSlugToBranchFile(branchFilePath, branch.slug);

    this.log(`‣ Successfully switched to branch \`${branch.slug}\``);
  }
}
