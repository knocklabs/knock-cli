import { Args } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import { spinner } from "@/lib/helpers/ux";
import * as Goal from "@/lib/marshal/goal";
import { GoalDirContext } from "@/lib/run-context";

export default class GoalNew extends BaseCommand<typeof GoalNew> {
  static summary = "Scaffold a new goal in the local file system.";

  static args = {
    goalKey: Args.string({
      required: true,
      description: "The key for the new goal.",
    }),
  };

  async run(): Promise<void> {
    const { goalKey } = this.props.args;

    const validationError = Goal.validateGoalKey(goalKey);
    if (validationError) {
      return this.error(`Invalid goal key: ${validationError}`);
    }

    const goalsIndexDirCtx = await resolveResourceDir(
      this.projectConfig,
      "goal",
      this.runContext.cwd,
    );

    const goalDirPath = `${goalsIndexDirCtx.abspath}/${goalKey}`;
    const exists = await Goal.isGoalDir(goalDirPath);

    if (exists) {
      return this.error(`A goal directory already exists at ${goalDirPath}`);
    }

    const goalDirCtx: GoalDirContext = {
      type: "goal",
      key: goalKey,
      abspath: goalDirPath,
      exists: false,
    };

    spinner.start("‣ Scaffolding");

    const newGoal = Goal.buildNewGoal(goalKey);
    await Goal.writeGoalDirFromData(goalDirCtx, newGoal as any, {
      withSchema: true,
    });

    spinner.stop();

    this.log(
      `‣ Successfully created new goal \`${goalKey}\` at ${goalDirPath}`,
    );
  }
}
