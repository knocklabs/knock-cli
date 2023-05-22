import { CliUx, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { ApiError, formatErrors } from "@/lib/helpers/error";
import { commaSeparatedStr, jsonStr } from "@/lib/helpers/flag";
import {
  formatErrorRespMessage,
  isSuccessResp,
  withSpinner,
} from "@/lib/helpers/request";
import * as Workflow from "@/lib/marshal/workflow";

export default class WorkflowRun extends BaseCommand {
  static flags = {
    environment: Flags.string({ default: "development" }),
    recipients: commaSeparatedStr({
      required: true,
      aliases: ["recipient"],
      multiple: true,
    }),
    actor: Flags.string(),
    tenant: Flags.string(),
    data: jsonStr(),
    local: Flags.boolean({ default: false }),
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
}
