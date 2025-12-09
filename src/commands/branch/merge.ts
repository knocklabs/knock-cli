import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { CustomArgs } from "@/lib/helpers/arg";
import { KnockEnv } from "@/lib/helpers/const";
import { withSpinnerV2 } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class BranchMerge extends BaseCommand<typeof BranchMerge> {
  static summary = "Merges a branch into the development environment.";

  static args = {
    slug: CustomArgs.slug({
      required: true,
      description: "The slug of the branch to merge",
    }),
  };

  static flags = {
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
    delete: Flags.boolean({
      summary: "Delete the branch after merging.",
      default: true,
      allowNo: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    const promotePrompt = `Merge all changes from branch \`${args.slug}\` into the development environment?`;
    const shouldPromote = flags.force || (await promptToConfirm(promotePrompt));
    if (!shouldPromote) return;

    await this.promoteBranchCommits();

    const deletePrompt = `Delete branch \`${args.slug}\`?`;
    const shouldDeleteBranch =
      flags.delete && (flags.force || (await promptToConfirm(deletePrompt)));
    if (!shouldDeleteBranch) return;

    await this.deleteBranch();
  }

  private async promoteBranchCommits(): Promise<void> {
    const { args } = this.props;

    await withSpinnerV2(() =>
      this.apiV1.mgmtClient.commits.promoteAll({
        branch: args.slug,
        to_environment: KnockEnv.Development,
      }),
    );

    this.log(
      `‣ Successfully merged all changes into the development environment`,
    );
  }

  private async deleteBranch(): Promise<void> {
    const { args } = this.props;

    await withSpinnerV2(
      () =>
        this.apiV1.mgmtClient.branches.delete(args.slug, {
          environment: KnockEnv.Development,
        }),
      { action: "‣ Deleting branch" },
    );

    this.log(`‣ Successfully deleted branch \`${args.slug}\``);
  }
}
