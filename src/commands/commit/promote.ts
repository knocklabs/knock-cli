import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class CommitPromote extends BaseCommand<typeof CommitPromote> {
  static summary =
    "Promote a single commit to the subsequent environment or all changes to the destination environment.";

  static flags = {
    to: Flags.string({
      summary:
        "The destination environment to promote all changes from the preceding environment.",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
    only: Flags.string({
      summary: "The ID of the commit to promote to the subsequent environment",
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // Currently this command support two modes of operation based on the flags:
    // * --to : Promotes all changes to the destination environment.
    // * --only: Promotes one commit to the subsequent enviroment
    // The absence or presence of both flags will result in an error.

    if (flags.to && flags.only) {
      throw new Error(
        "The flags `--to` and `--only` cannot be used together.\n See more help with --help",
      );
    }

    if (!flags.to && !flags.only) {
      throw new Error(
        "You must specify either the `--to` or `--only` flag.\n See more help with --help",
      );
    }

    if (flags.to) {
      // Confirm first as we are about to promote changes to go live in the target
      // environment, unless forced.
      const prompt = `Promote all changes to \`${flags.to}\` environment?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;

      await withSpinner<ApiV1.PromoteChangesResp>(() =>
        this.apiV1.promoteAllChanges(this.props),
      );

      this.log(
        `‣ Successfully promoted all changes to \`${flags.to}\` environment`,
      );
    } else {
      const prompt = `Promote commit \`${flags.only}\` ?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;

      await withSpinner<ApiV1.PromoteChangesResp>(() =>
        this.apiV1.promoteCommitChanges(this.props),
      );

      this.log(`‣ Successfully promoted commit \`${flags.only}\` `);
    }
  }
}
