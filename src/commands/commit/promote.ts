import { Flags } from "@oclif/core";
import enquirer from "enquirer";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { withSpinner } from "@/lib/helpers/request";

const promptToConfirm = async ({
  flags,
}: Props): Promise<string | undefined> => {
  try {
    const { input } = await enquirer.prompt<{ input: string }>({
      type: "confirm",
      name: "input",
      message: `Promote all changes to \`${flags.to}\` environment?`,
    });
    return input;
  } catch (error) {
    console.log(error);
  }
};

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
    if (!flags.force) {
      const input = await promptToConfirm(this.props);
      if (!input) return;
    }

    await withSpinner<ApiV1.PromoteAllChangesResp>(() =>
      this.apiV1.promoteAllChanges(this.props),
    );

    this.log(
      `‣ Successfully promoted all changes to \`${flags.to}\` environment`,
    );
  }
}
