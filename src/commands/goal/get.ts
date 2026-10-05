import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";
import * as Goal from "@/lib/marshal/goal";

export default class GoalGet extends BaseCommand<typeof GoalGet> {
  static summary = "Display a single goal from an environment.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
  };

  static args = {
    goalKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetGoalResp | void> {
    spinner.start("‣ Loading");

    const { goal } = await this.loadGoal();

    spinner.stop();

    const { flags } = this.props;
    if (flags.json) return goal;

    this.render(goal);
  }

  private async loadGoal(): Promise<{
    goal: ApiV1.GetGoalResp;
  }> {
    const goalResp = await this.apiV1.getGoal(this.props);

    if (!isSuccessResp(goalResp)) {
      const message = formatErrorRespMessage(goalResp);
      ux.error(new ApiError(message));
    }

    return {
      goal: goalResp.data,
    };
  }

  render(goal: ApiV1.GetGoalResp): void {
    const { goalKey } = this.props.args;

    const scope = formatCommandScope(this.props.flags);
    this.log(`‣ Showing goal \`${goalKey}\` in ${scope}\n`);

    const rows = [
      {
        key: "Status",
        value: Goal.formatStatus(goal),
      },
      {
        key: "Name",
        value: goal.name,
      },
      {
        key: "Key",
        value: goal.key,
      },
      {
        key: "Description",
        value: goal.description || "-",
      },
      {
        key: "Target Type",
        value: goal.target.type,
      },
      {
        key: "Target Threshold",
        value: goal.target.threshold?.toString() || "-",
      },
      {
        key: "Target Unit",
        value: goal.target.unit || "-",
      },
      {
        key: "Target Expression",
        value: goal.target.expression || "-",
      },
      {
        key: "Window Size",
        value: goal.window.size.toString(),
      },
      {
        key: "Window Unit",
        value: goal.window.unit,
      },
      {
        key: "Tags",
        value: Goal.formatTags(goal, { emptyDisplay: "-" }),
      },
      {
        key: "Created at",
        value: formatDateTime(goal.created_at),
      },
      {
        key: "Updated at",
        value: formatDateTime(goal.updated_at),
      },
    ];

    ux.table(rows, {
      key: {
        header: "Goal",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 24,
      },
    });
  }
}
