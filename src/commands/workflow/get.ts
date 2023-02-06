import { CliUx, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDateTime } from "@/lib/helpers/date";
import { withSpinner } from "@/lib/helpers/request";
import * as Conditions from "@/lib/marshal/conditions";
import * as Workflow from "@/lib/marshal/workflow";

export default class WorkflowGet extends BaseCommand {
  static flags = {
    environment: Flags.string({ default: "development" }),
    "hide-uncommitted-changes": Flags.boolean(),
  };

  static args = [{ name: "workflowKey", required: true }];

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetWorkflowResp | void> {
    const resp = await withSpinner<ApiV1.GetWorkflowResp>(() =>
      this.apiV1.getWorkflow(this.props),
    );

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  render(workflow: ApiV1.GetWorkflowResp): void {
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

    CliUx.ux.table(rows, {
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

    if (workflow.steps.length === 0) {
      return CliUx.ux.log(" This workflow has no steps to display.");
    }

    /*
     * Workflow steps table
     */

    const steps = workflow.steps.map((step, index) => ({ ...step, index }));

    CliUx.ux.table(steps, {
      index: {
        header: "Steps",
        get: (step) => step.index + 1,
      },
      ref: {
        header: "Ref",
        minWidth: 18,
      },
      type: {
        header: "Type",
        minWidth: 12,
      },
      summary: {
        header: "Summary",
        get: (step) => Workflow.formatStepSummary(step),
      },
      conditions: {
        header: "Conditions",
        get: (step) =>
          step.conditions ? Conditions.formatConditions(step.conditions) : "-",
      },
    });
  }
}
