import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDateTime } from "@/lib/helpers/date";
import { withSpinner } from "@/lib/helpers/request";
import * as Conditions from "@/lib/marshal/conditions";
import * as Workflow from "@/lib/marshal/workflow";

type WorkflowStepWithKey = Workflow.WorkflowStepData & { key: string };

type WorkflowBranchWithKey = Workflow.WorkflowBranch & {
  type: "branch";
  isDefault: boolean;
  key: string;
};

type WorkflowStepOrBranchWithKey = WorkflowStepWithKey | WorkflowBranchWithKey;

const LOWERCASE_A_CHAR_CODE = 97;

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
    const { data: whoami } = await withSpinner<ApiV1.WhoamiResp>(
      () => this.apiV1.whoami(),
      { action: "‣ Verifying account info" },
    );

    const { data: workflow } = await withSpinner<ApiV1.GetWorkflowResp>(
      () => this.apiV1.getWorkflow(this.props),
      { action: "‣ Loading workflow" },
    );

    const { flags } = this.props;
    if (flags.json) return workflow;

    this.render(workflow, whoami);
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

    const { stepsAndBranches, hasIfElseSteps } = this.flattenSteps(
      workflow.steps,
    );

    ux.table(stepsAndBranches, {
      index: {
        header: "Steps",
        get: (stepOrBranch) => stepOrBranch.key,
      },
      ref: {
        header: "Ref",
        minWidth: 18,
        get: (stepOrBranch) =>
          stepOrBranch.type === "branch" ? "-" : stepOrBranch.ref,
      },
      type: {
        header: "Type",
        minWidth: 12,
        get: (stepOrBranch) =>
          stepOrBranch.type === "branch" ? "branch" : stepOrBranch.type,
      },
      summary: {
        header: "Summary",
        get: (stepOrBranch) =>
          stepOrBranch.type === "branch"
            ? Workflow.formatBranchSummary(stepOrBranch)
            : Workflow.formatStepSummary(stepOrBranch),
      },
      conditions: {
        header: "Conditions",
        get: (stepOrBranch) => {
          if (stepOrBranch.type === Workflow.StepType.IfElse) return "-";

          if (stepOrBranch.type === "branch" && stepOrBranch.isDefault) {
            return "Default branch";
          }

          if (!stepOrBranch.conditions) return "-";

          return Conditions.formatConditions(stepOrBranch.conditions);
        },
      },
    });

    if (hasIfElseSteps) {
      this.log(
        `\n‣ This workflow has branches with nested steps.\n‣ You can view the full step tree in the Knock Dashboard here: https://dashboard.knock.app/${
          whoami.account_slug
        }/${env.toLowerCase()}/workflows/${workflow.key}`,
      );
    }
  }

  // Returns a steps list with any top-level if-else branches mixed in for
  // display in the table
  private flattenSteps(steps: Workflow.WorkflowStepData[]): {
    stepsAndBranches: WorkflowStepOrBranchWithKey[];
    hasIfElseSteps: boolean;
  } {
    let stepsAndBranches: WorkflowStepOrBranchWithKey[] = [];
    let stepsCount = 0;
    let hasIfElseSteps = false;

    for (const step of steps) {
      stepsCount += 1;

      stepsAndBranches.push({ ...step, key: stepsCount.toString() });

      if (step.type === Workflow.StepType.IfElse) {
        for (let branchIdx = 0; branchIdx < step.branches.length; branchIdx++) {
          const branch = step.branches[branchIdx];
          const branchLetter = String.fromCharCode(
            LOWERCASE_A_CHAR_CODE + branchIdx,
          );

          const branchWithKey: WorkflowBranchWithKey = {
            ...branch,
            type: "branch",
            isDefault: branchIdx === step.branches.length - 1,
            key: `> Branch ${stepsCount}${branchLetter}`,
          };

          stepsAndBranches.push(branchWithKey);
          hasIfElseSteps = hasIfElseSteps || true;
        }
      }
    }

    return { stepsAndBranches, hasIfElseSteps };
  }
}
