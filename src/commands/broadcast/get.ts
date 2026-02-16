import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as Broadcast from "@/lib/marshal/broadcast";
import * as Conditions from "@/lib/marshal/conditions";
import * as Workflow from "@/lib/marshal/workflow";
import { viewBroadcastUrl } from "@/lib/urls";

export default class BroadcastGet extends BaseCommand<typeof BroadcastGet> {
  static summary = "Display a single broadcast from an environment.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
  };

  static args = {
    broadcastKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetBroadcastResp | void> {
    spinner.start("‣ Loading");

    const { broadcast, whoami } = await this.loadBroadcast();

    spinner.stop();

    const { flags } = this.props;
    if (flags.json) return broadcast;

    this.render(broadcast, whoami);
  }

  private async loadBroadcast(): Promise<{
    broadcast: ApiV1.GetBroadcastResp;
    whoami: ApiV1.WhoamiResp;
  }> {
    const broadcastResp = await this.apiV1.getBroadcast(this.props);

    if (!isSuccessResp(broadcastResp)) {
      const message = formatErrorRespMessage(broadcastResp);
      ux.error(new ApiError(message));
    }

    const whoamiResp = await this.apiV1.whoami();

    if (!isSuccessResp(whoamiResp)) {
      const message = formatErrorRespMessage(whoamiResp);
      ux.error(new ApiError(message));
    }

    return {
      broadcast: broadcastResp.data,
      whoami: whoamiResp.data,
    };
  }

  render(broadcast: ApiV1.GetBroadcastResp, whoami: ApiV1.WhoamiResp): void {
    const { broadcastKey } = this.props.args;
    const { environment, branch } = this.props.flags;
    const scope = formatCommandScope(this.props.flags);
    this.log(`‣ Showing broadcast \`${broadcastKey}\` in ${scope}\n`);

    const rows = [
      {
        key: "Status",
        value: Broadcast.formatStatus(broadcast),
      },
      {
        key: "Name",
        value: broadcast.name,
      },
      {
        key: "Key",
        value: broadcast.key,
      },
      {
        key: "Description",
        value: broadcast.description || "-",
      },
      {
        key: "Categories",
        value: Broadcast.formatCategories(broadcast, { emptyDisplay: "-" }),
      },
      {
        key: "Target audience",
        value: broadcast.target_audience_key || "-",
      },
      {
        key: "Scheduled at",
        value: broadcast.scheduled_at
          ? formatDateTime(broadcast.scheduled_at)
          : "-",
      },
      {
        key: "Sent at",
        value: broadcast.sent_at ? formatDateTime(broadcast.sent_at) : "-",
      },
      {
        key: "Created at",
        value: formatDateTime(broadcast.created_at),
      },
      {
        key: "Updated at",
        value: formatDateTime(broadcast.updated_at),
      },
    ];

    ux.table(rows, {
      key: {
        header: "Broadcast",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 24,
      },
    });

    this.log("");

    if (broadcast.steps.length === 0) {
      return ux.log(" This broadcast has no steps to display.");
    }

    const steps = broadcast.steps.map((step, index) => ({ ...step, index }));

    ux.table(steps, {
      index: {
        header: "Steps",
        get: (step) => step.index + 1,
      },
      ref: {
        header: "Ref",
        minWidth: 18,
        get: (step) => step.ref,
      },
      type: {
        header: "Type",
        minWidth: 12,
        get: (step) => step.type,
      },
      summary: {
        header: "Summary",
        get: (step) => Workflow.formatStepSummary(step),
      },
      conditions: {
        header: "Conditions",
        get: (step) => {
          if (step.type === Workflow.StepType.Branch) return "-";
          if (!step.conditions) return "-";

          return Conditions.formatConditions(step.conditions);
        },
      },
    });

    const hasTopLevelBranchStep = broadcast.steps.some(
      (step) => step.type === Workflow.StepType.Branch,
    );

    const dashboardLinkMessage = hasTopLevelBranchStep
      ? `\n‣ This broadcast has branches with nested steps, view the full broadcast tree in the Knock Dashboard:`
      : `\n‣ View the full broadcast in the Knock Dashboard:`;

    const url = viewBroadcastUrl(
      this.sessionContext.dashboardOrigin,
      whoami.account_slug,
      branch ?? environment,
      broadcast.key,
    );

    this.log(dashboardLinkMessage);
    this.log(indentString(url, 2));
  }
}
