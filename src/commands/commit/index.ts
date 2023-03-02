import { Flags } from "@oclif/core";
import enquirer from "enquirer";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { withSpinner } from "@/lib/helpers/request";

// TODO(KNO-2647): Abstract this out as a helper.
const promptToConfirm = async (): Promise<string | undefined> => {
  try {
    const { input } = await enquirer.prompt<{ input: string }>({
      type: "confirm",
      name: "input",
      message: "Commit all changes in the development environment?",
    });
    return input;
  } catch (error) {
    console.log(error);
  }
};

export default class Commit extends BaseCommand {
  static flags = {
    environment: Flags.string({
      summary:
        "Committing changes applies to the development environment only, use `commit promote` to promote changes to a later environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    commit_message: Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
    }),
    force: Flags.boolean(),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // Confirm first as we are about to commit changes to go live in the
    // development environment, unless forced.
    if (!flags.force) {
      const input = await promptToConfirm();
      if (!input) return;
    }

    await withSpinner<ApiV1.CommitAllChangesResp>(() =>
      this.apiV1.commitAllChanges(this.props),
    );

    this.log(
      `‣ Successfully committed all changes in \`${flags.environment}\` environment`,
    );
  }
}
