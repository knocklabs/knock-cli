import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatErrors } from "@/lib/helpers/error";
import { jsonStr } from "@/lib/helpers/flag";
import * as CustomFlags from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import * as Workflow from "@/lib/marshal/workflow";
import { CommandTargetProps } from "@/lib/marshal/workflow";

export default class WorkflowRun extends BaseCommand<typeof WorkflowRun> {
  static summary =
    "Test run a workflow using the latest version from Knock, or a local workflow directory.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment in which to run the workflow",
    }),
    recipients: CustomFlags.commaSeparatedStr({
      required: true,
      aliases: ["recipient"],
      summary:
        "One or more recipient ids for this workflow run, separated by comma.",
    }),
    actor: Flags.string({
      summary: "An actor id for the workflow run.",
    }),
    tenant: Flags.string({
      summary: "A tenant id for the workflow run.",
    }),
    data: jsonStr({
      summary: "A JSON string of the data for this workflow",
    }),
    local: Flags.boolean({
      default: false,
      summary: "Whether to use the local file version of this workflow",
    }),
  };

  static args = {
    workflowKey: Args.string({
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    const workflow = flags.local ? await this.getWorkflowInput() : undefined;

    const resp = await withSpinner<ApiV1.RehearseWorkflowResp>(
      () => this.apiV1.runWorkflow(this.props, workflow),
      { action: "‣ Running" },
    );

    this.log(
      `‣ Successfully ran \`${args.workflowKey}\` workflow in \`${flags.environment}\` environment`,
    );
    this.log(indentString(`Workflow run id: ${resp.data.workflow_run_id}`, 2));
  }

  async getWorkflowInput(): Promise<Workflow.WorkflowInput | undefined> {
    const target = await Workflow.ensureValidCommandTarget(
      this.props as CommandTargetProps,
      this.runContext,
    );

    const { type: targetType, context: targetCtx } = target;

    if (targetType !== "workflowDir") {
      throw new Error(`Unsupported command target: ${target}`);
    }

    if (!targetCtx.exists) {
      return ux.error(
        `Cannot locate a workflow directory at \`${targetCtx.abspath}\``,
      );
    }

    const [workflow, readErrors] = await Workflow.readWorkflowDir(targetCtx, {
      withExtractedFiles: true,
    });

    if (readErrors.length > 0) {
      return this.error(formatErrors(readErrors));
    }

    return workflow as Workflow.WorkflowInput;
  }
}
