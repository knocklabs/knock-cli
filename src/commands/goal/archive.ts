import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";

export default class GoalArchive extends BaseCommand<typeof GoalArchive> {
  static summary = "Archive a goal across all environments.";

  static description =
    "Archives a goal, making it unavailable across all environments. This does not detach the goal from any workflows, guides, or broadcasts.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
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

    const prompt = `Archive goal \`${goalKey}\`? This will archive the goal across all environments.`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    spinner.start("‣ Archiving");

    const resp = await this.apiV1.archiveGoal(this.props);

    if (!isSuccessResp(resp)) {
      spinner.stop();
      const message = formatErrorRespMessage(resp);
      return this.error(new ApiError(message));
    }

    spinner.stop();

    const scope = formatCommandScope(flags);
    this.log(`‣ Successfully archived \`${goalKey}\` in ${scope}`);
  }
}
