import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";
import * as Goal from "@/lib/marshal/goal";

export default class GoalValidate extends BaseCommand<typeof GoalValidate> {
  static summary = "Validate one or more goals from a local file system.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use for validation.",
    }),
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

    spinner.stop();

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    const scope = formatCommandScope(this.props.flags);
    const goalKeys = goals.map((g) => g.key).join(", ");
    this.log(
      `‣ Successfully validated ${goals.length} goal(s) in ${scope}: ${goalKeys}`,
    );
  }

  static async validateAll(
    apiV1Client: ApiV1.default,
    props: Props,
    goals: Goal.GoalDirData[],
  ): Promise<SourceError[]> {
    const errors: SourceError[] = [];

    for (const goal of goals) {
      // eslint-disable-next-line no-await-in-loop
      const resp = await apiV1Client.validateGoal(props, {
        ...goal.content,
        key: goal.key,
      } as Goal.GoalData);

      if (!isSuccessResp(resp)) {
        const error = new SourceError(
          formatErrorRespMessage(resp),
          Goal.goalJsonPath(goal),
          "ApiError",
        );
        errors.push(error);
      }
    }

    return errors;
  }
}
