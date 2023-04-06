import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class CommitPromote extends BaseCommand {
  static flags = {
    to: Flags.string({
      summary:
        "The destination environment to promote changes from the preceding environment",
      required: true,
    }),
    force: Flags.boolean(),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // Confirm first as we are about to promote changes to go live in the target
    // environment, unless forced.
    const prompt = `Promote all changes to \`${flags.to}\` environment?`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    await withSpinner<ApiV1.PromoteAllChangesResp>(() =>
      this.apiV1.promoteAllChanges(this.props),
    );

    this.log(
      `‣ Successfully promoted all changes to \`${flags.to}\` environment`,
    );
  }
}
