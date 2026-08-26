import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Goal from "@/lib/marshal/goal";
import { WithAnnotation } from "@/lib/marshal/shared/types";

export default class GoalClone extends BaseCommand<typeof GoalClone> {
  static summary = "Clone a goal to a new goal key.";

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
      description: "The key of the goal to clone.",
    }),
    newGoalKey: Args.string({
      required: true,
      description: "The key for the new cloned goal.",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;
    const { goalKey, newGoalKey } = args;

    const validationError = Goal.validateGoalKey(newGoalKey);
    if (validationError) {
      return this.error(`Invalid goal key: ${validationError}`);
    }

    const prompt = `Clone goal \`${goalKey}\` to \`${newGoalKey}\`?`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    spinner.start("‣ Cloning");

    const resp = await this.apiV1.cloneGoal<WithAnnotation>(
      this.props,
      newGoalKey,
    );

    if (!isSuccessResp(resp)) {
      spinner.stop();
      const message = formatErrorRespMessage(resp);
      return this.error(new ApiError(message));
    }

    spinner.stop();

    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully cloned \`${goalKey}\` to \`${newGoalKey}\` in ${scope}`,
    );
  }
}
