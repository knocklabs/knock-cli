import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { withSpinnerV2 } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class BranchDelete extends BaseCommand<typeof BranchDelete> {
  // Hide until branches are released in GA
  static hidden = true;

  static summary = "Deletes an existing branch with the given slug.";

  static args = {
    slug: Args.string({
      required: true,
    }),
  };

  static flags = {
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    // Confirm before deleting the branch, unless forced
    const prompt = `Delete branch \`${args.slug}\`?`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    await withSpinnerV2(
      () => this.apiV1.mgmtClient.delete(`/v1/branches/${args.slug}`),
      { action: "‣ Deleting branch" },
    );

    this.log(`‣ Successfully deleted branch \`${args.slug}\``);
  }
}
