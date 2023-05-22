import { CliUx, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { commaSeparatedStr, jsonStr } from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as Workflow from "@/lib/marshal/workflow";

import WorkflowValidate from "./validate";

export default class WorkflowRun extends BaseCommand {
  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment in which to run the workflow",
    }),
    recipients: commaSeparatedStr({
      required: true,
      aliases: ["recipient"],
      summary:
        "One or more recipient ids for this workflow run, separated by comma.",
    }),
    actor: Flags.string({ summary: "An actor id for the workflow run." }),
    tenant: Flags.string({
      summary: "A tenant id for the workflow run.",
    }),
    data: jsonStr({
      summary: "A JSON string of the data for this workflow",
    }),
  };

  static args = [{ name: "workflowKey", required: true }];

  async run(): Promise<void> {
    const { args, flags } = this.props;

    if (flags.local) {
      return this.runLocal();
    }

    const resp = await withSpinner<ApiV1.RehearseWorkflowResp>(
      () => {
        return this.apiV1.runWorkflow(this.props);
      },
      { action: "‣ Running" },
    );

    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      return this.error(new ApiError(message));
    }

    this.log(
      `‣ Successfully ran \`${args.workflowKey}\` workflow in \`${flags.environment}\` environment. Run id: ${resp.data.workflow_run_id}.`,
    );
  }

  async runLocal(): Promise<void> {
    const target = await Workflow.ensureValidCommandTarget(
      this.props,
      this.runContext,
    );

    const { type: targetType, context: targetCtx } = target;

    if (targetType !== "workflowDir") {
      throw new Error(`Unsupported command target: ${target}`);
    }

    if (!targetCtx.exists) {
      return CliUx.ux.error(
        `Cannot locate a workflow directory at \`${targetCtx.abspath}\``,
      );
    }

    const [workflow, readErrors] = await Workflow.readWorkflowDir(targetCtx, {
      withExtractedFiles: true,
    });

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors));
    }

    await withSpinner<ApiV1.RehearseWorkflowResp>(
      () => {
        return this.apiV1.runWorkflow(this.props, {
          ...workflow,
          key: this.props.args.workflowKey,
        });
      },
      { action: `‣ Requesting workflow run` },
    );
  }

  async run(): Promise<void> {
    const { args, flags } = this.props;

    if (flags["run-local"]) {
      return this.runLocal();
    }

    const resp = await withSpinner<ApiV1.RehearseWorkflowResp>(
      () => {
        return this.apiV1.runWorkflow(this.props);
      },
      { action: "‣ Running" },
    );

    this.log(
      `‣ Successfully ran \`${args.workflowKey}\` workflow in \`${flags.environment}\` environment`,
    );
    this.log(indentString(`Workflow run id: ${resp.data.workflow_run_id}`), 4);
  }
}
