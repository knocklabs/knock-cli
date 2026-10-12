import { Args, Flags, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";

export default class GoalArchive extends BaseCommand<typeof GoalArchive> {
  static summary = "Archive a goal across all environments.";

  static description = `
Archives a goal across all environments. The API refuses the archive if any
workflow, guide, or broadcast is still attached to the goal.
`;

  static flags = {
    environment: CustomFlags.environment,
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  static args = {
    goalKey: Args.string({
      required: true,
      description: "The key of the goal to archive.",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;
    const { goalKey } = args;

    if (!flags.force) {
      const confirmed = await promptToConfirm(
        `WARNING: Archiving goal \`${goalKey}\` will affect ALL environments.\n` +
          `This action cannot be undone. Continue?`,
      );
      if (!confirmed) {
        this.log("Archive cancelled.");
        return;
      }
    }

    spinner.start(`‣ Archiving goal \`${goalKey}\``);

    try {
      await this.apiV1.mgmtClient.goals.archive(goalKey, {
        environment: flags.environment,
      });

      spinner.stop();

      this.log(
        `‣ Successfully archived goal \`${goalKey}\` across all environments.`,
      );
    } catch (error) {
      spinner.stop();
      ux.error(new ApiError((error as Error).message));
    }
  }
}
