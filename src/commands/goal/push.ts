import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatError, formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as Goal from "@/lib/marshal/goal";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import GoalValidate from "./validate";

export default class GoalPush extends BaseCommand<typeof GoalPush> {
  static summary = "Push one or more goals from a local file system to Knock.";

  static flags = {
    environment: Flags.string({
      summary: "The environment to push the goal to. Defaults to development.",
      default: KnockEnv.Development,
    }),
    all: Flags.boolean({
      summary: "Whether to push all goals from the target directory.",
    }),
    "goals-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all goals to push.",
      dependsOn: ["all"],
    }),
    force: CustomFlags.force,
  };

  static args = {
    goalKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    const target = await Goal.ensureValidCommandTarget(
      this.props,
      this.runContext,
      this.projectConfig,
    );
    const [goals, readErrors] = await Goal.readAllForCommandTarget(target);

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (goals.length === 0) {
      this.error(`No goal directories found in ${target.context.abspath}`);
    }

    spinner.start(`‣ Validating`);

    const apiErrors = await GoalValidate.validateAll(
      this.apiV1,
      this.props,
      goals,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    spinner.start(`‣ Pushing`);

    for (const goal of goals) {
      const props = merge(this.props, { flags: { annotate: true } });

      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertGoal<WithAnnotation>(props, {
        ...goal.content,
        key: goal.key,
      } as Goal.GoalData);

      if (isSuccessResp(resp)) {
        // eslint-disable-next-line no-await-in-loop
        await Goal.writeGoalDirFromData(goal, resp.data.goal!, {
          withSchema: true,
        });
        continue;
      }

      const error = new SourceError(
        formatErrorRespMessage(resp),
        Goal.goalJsonPath(goal),
        "ApiError",
      );
      this.error(formatError(error));
    }

    spinner.stop();

    const goalKeys = goals.map((g) => g.key);

    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully pushed ${goals.length} goal(s) to ${scope}:\n` +
        indentString(goalKeys.join("\n"), 4),
    );
  }
}
