import type { Branch } from "@knocklabs/mgmt/resources/branches";
import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { CustomArgs } from "@/lib/helpers/arg";
import { KnockEnv } from "@/lib/helpers/const";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class BranchRebase extends BaseCommand<typeof BranchRebase> {
  static summary =
    "Rebases a branch onto the development environment, bringing in changes from main while preserving branch commits.";

  static enableJsonFlag = true;

  static args = {
    slug: CustomArgs.slug({
      required: true,
      description: "The slug of the branch to rebase",
    }),
  };

  static flags = {
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  async run(): Promise<Branch | void> {
    const { args, flags } = this.props;

    const prompt = `Rebase branch \`${args.slug}\` with main? This updates your branch with the latest changes from main while preserving your branch's commits.`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    const resp = await withSpinner<Branch>(
      () => this.apiV1.rebaseBranch(args.slug, KnockEnv.Development),
      { action: "‣ Rebasing branch" },
    );

    const data = resp.data;

    if (flags.json) return data;

    this.render(data);
  }

  async render(data: Branch): Promise<void> {
    this.log(`‣ Successfully rebased branch \`${data.slug}\``);
    this.log(`  Updated at: ${data.updated_at}`);
  }
}
