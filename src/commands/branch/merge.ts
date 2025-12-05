import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { CustomArgs } from "@/lib/helpers/arg";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class BranchMerge extends BaseCommand<typeof BranchMerge> {
  static summary = "Merges a branch into the development environment.";

  static args = {
    slug: CustomArgs.slug({
      required: true,
      description: "The slug of the branch to delete",
    }),
  };

  static flags = {
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;
    const prompt = `Merge all changes from branch \`${args.slug}\` into the development environment?`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    // TODO
  }
}
