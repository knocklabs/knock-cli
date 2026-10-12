import { Goal } from "@knocklabs/mgmt/resources/goals";
import { Args, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { spinner } from "@/lib/helpers/ux";

export default class GoalGet extends BaseCommand<typeof GoalGet> {
  static summary = "Display a single goal from an environment.";

  static flags = {
    environment: CustomFlags.environment,
  };

  static args = {
    goalKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<Goal | void> {
    spinner.start("‣ Loading");

    const { goal } = await this.loadGoal();

    spinner.stop();

    const { flags } = this.props;
    if (flags.json) return goal;

    this.render(goal);
  }

  private async loadGoal(): Promise<{ goal: Goal }> {
    const { goalKey } = this.props.args;
    const { flags } = this.props;

    try {
      const goal = await this.apiV1.mgmtClient.goals.retrieve(goalKey, {
        environment: flags.environment,
      });

      return { goal };
    } catch (error) {
      ux.error(new ApiError((error as Error).message));
    }
  }

  render(goal: Goal): void {
    const { goalKey } = this.props.args;

    const scope = formatCommandScope(this.props.flags);
    this.log(`‣ Showing goal \`${goalKey}\` in ${scope}\n`);

    const event = goal.condition.event;
    const rows = [
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
        key: "Event type",
        value: event.event_type,
      },
      {
        key: "Event key",
        value: event.event_key,
      },
      ...(event.event_type === "integration_source"
        ? [
            {
              key: "Integration source",
              value: event.integration_source_key,
            },
            {
              key: "Recipient path",
              value: event.recipient_path || "-",
            },
          ]
        : [
            {
              key: "Audience key",
              value: event.audience_key,
            },
          ]),
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
