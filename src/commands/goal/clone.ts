import { Args, Flags, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Goal from "@/lib/marshal/goal";

export default class GoalClone extends BaseCommand<typeof GoalClone> {
  static summary = "Clone a goal to a new goal key.";

  static flags = {
    environment: CustomFlags.environment,
    "dest-environment": Flags.string({
      summary:
        "The destination environment for the clone. Defaults to --environment.",
    }),
    name: Flags.string({
      summary: "The name for the cloned goal. Defaults to the new goal key.",
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

    const destEnvironment =
      flags["dest-environment"] ||
      flags.environment ||
      (await this.apiV1.getDefaultEnvironmentSlug());
    const name = flags.name || newGoalKey;

    const prompt = `Clone goal \`${goalKey}\` to \`${newGoalKey}\` in ${destEnvironment}?`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    spinner.start("‣ Cloning");

    try {
      await this.apiV1.mgmtClient.goals.clone(goalKey, {
        environment: flags.environment,
        clone: {
          key: newGoalKey,
          name,
          environment: destEnvironment,
        },
      });

      spinner.stop();

      const scope = formatCommandScope(flags);
      this.log(
        `‣ Successfully cloned \`${goalKey}\` to \`${newGoalKey}\` from ${scope}`,
      );
    } catch (error) {
      spinner.stop();
      ux.error(new ApiError((error as Error).message));
    }
  }
}
