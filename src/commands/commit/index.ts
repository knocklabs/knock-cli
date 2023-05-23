import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class Commit extends BaseCommand<typeof Commit> {
  static summary = "Commit all changes in development environment.";

  static flags = {
    environment: Flags.string({
      summary:
        "Committing changes applies to the development environment only, use `commit promote` to promote changes to a subsequent environment.",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message.",
      char: "m",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // Confirm first as we are about to commit changes to go live in the
    // development environment, unless forced.
    const prompt = "Commit all changes in the development environment?";
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    await withSpinner<ApiV1.CommitAllChangesResp>(() =>
      this.apiV1.commitAllChanges(this.props),
    );

    this.log(
      `‣ Successfully committed all changes in \`${flags.environment}\` environment`,
    );
  }
}
