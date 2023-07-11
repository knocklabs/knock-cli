import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as Conditions from "@/lib/marshal/conditions";
import * as Workflow from "@/lib/marshal/workflow";

export default class WorkflowGet extends BaseCommand<typeof WorkflowGet> {
  static summary = "Display a single workflow from an environment.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
  };

  static args = {
    workflowKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetWorkflowResp | void> {
    spinner.start("‣ Loading");

    const { workflow, whoami } = await this.loadWorkflow();

    spinner.stop();

    const { flags } = this.props;
    if (flags.json) return workflow;

    this.render(workflow, whoami);
  }

  private async loadWorkflow(): Promise<{
    workflow: ApiV1.GetWorkflowResp;
    whoami: ApiV1.WhoamiResp;
  }> {
    const workflowResp = await this.apiV1.getWorkflow(this.props);

    if (!isSuccessResp(workflowResp)) {
      const message = formatErrorRespMessage(workflowResp);
      ux.error(new ApiError(message));
    }

    const whoamiResp = await this.apiV1.whoami();

    if (!isSuccessResp(whoamiResp)) {
      const message = formatErrorRespMessage(whoamiResp);
      ux.error(new ApiError(message));
    }

    return {
      workflow: workflowResp.data,
      whoami: whoamiResp.data,
    };
  }

  render(workflow: ApiV1.GetWorkflowResp, whoami: ApiV1.WhoamiResp): void {
    const { workflowKey } = this.props.args;
    const { environment: env, "hide-uncommitted-changes": commitedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !commitedOnly ? "(including uncommitted)" : "";

    this.log(
      `‣ Showing workflow \`${workflowKey}\` in \`${env}\` environment ${qualifier}\n`,
    );

    /*
     * Workflow table
     */

    const rows = [
      {
        key: "Status",
        value: Workflow.formatStatus(workflow),
      },
      {
        key: "Name",
        value: workflow.name,
      },
      {
        key: "Key",
        value: workflow.key,
      },
      {
        key: "Description",
        value: workflow.description || "-",
      },
      {
        key: "Categories",
        value: Workflow.formatCategories(workflow, { emptyDisplay: "-" }),
      },
      {
        key: "Created at",
        value: formatDateTime(workflow.created_at),
      },
      {
        key: "Updated at",
        value: formatDateTime(workflow.updated_at),
      },
    ];

    ux.table(rows, {
      key: {
        header: "Workflow",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 24,
      },
    });

    this.log("");

    // Leading space is there intentionally to align the left padding.
    if (workflow.steps.length === 0) {
      return ux.log(" This workflow has no steps to display.");
    }

    /*
     * Workflow steps table
     */

    const steps = workflow.steps.map((step, index) => ({ ...step, index }));

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
          if (step.type === Workflow.StepType.IfElse) return "-";
          if (!step.conditions) return "-";

          return Conditions.formatConditions(step.conditions);
        },
      },
    });

    const hasTopLevelIfElseStep = workflow.steps.some(
      (step) => step.type === Workflow.StepType.IfElse,
    );

    const dashboardLinkMessage = hasTopLevelIfElseStep
      ? `\n‣ This workflow has branches with nested steps, view the full workflow tree in the Knock Dashboard:`
      : `\n‣ View the full workflow in the Knock Dashboard:`;

    const viewWorkflowUrl = `https://dashboard.knock.app/${
      whoami.account_slug
    }/${env.toLowerCase()}/workflows/${workflow.key}`;

    this.log(dashboardLinkMessage);
    this.log(indentString(viewWorkflowUrl, 2));
  }
}
