import type { GoalRequest } from "@knocklabs/mgmt/resources/goals";
import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import {
  formatErrors,
  isSoftFailableBulkError,
  SourceError,
} from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as Goal from "@/lib/marshal/goal";

import GoalPush from "./push";

export default class GoalValidate extends BaseCommand<typeof GoalValidate> {
  static summary = "Validate one or more goals from a local file system.";

  static flags = {
    environment: CustomFlags.environment,
    all: Flags.boolean({
      summary: "Whether to validate all goals in the target directory.",
    }),
    "goals-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all goals to validate.",
      dependsOn: ["all"],
    }),
  };

  static args = {
    goalKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
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

    const goalKeys = goals.map((g) => g.key);
    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Successfully validated ${goals.length} goal(s) in ${scope}:\n` +
        indentString(goalKeys.join("\n"), 4),
    );
  }

  static async validateAll(
    api: ApiV1.T,
    props: Props<typeof GoalValidate | typeof GoalPush>,
    goals: Goal.GoalDirData[],
  ): Promise<SourceError[]> {
    const { flags } = props;

    const errorPromises = goals.map(async (goal) => {
      try {
        await api.mgmtClient.goals.validate(goal.key, {
          environment: flags.environment,
          goal: Goal.toGoalRequest(goal.content) as GoalRequest,
        });

        return;
      } catch (error) {
        // Bubble gate/scope failures so bulk push can soft-skip; keep
        // validation failures as SourceErrors for the normal error path.
        if (isSoftFailableBulkError(error)) {
          throw error;
        }

        return new SourceError(
          (error as Error).message,
          Goal.goalJsonPath(goal),
          "ApiError",
        );
      }
    });

    const errors = (await Promise.all(errorPromises)).filter(
      (e): e is Exclude<typeof e, undefined> => Boolean(e),
    );

    return errors;
  }
}
