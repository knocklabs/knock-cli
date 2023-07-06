import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import {
  jsonStr,
  maybeJsonStr,
  stringOrJsonStringList,
} from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";

export default class WorkflowRun extends BaseCommand<typeof WorkflowRun> {
  static summary = "Test run a workflow using the latest version from Knock.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment in which to run the workflow",
    }),
    recipients: stringOrJsonStringList({
      required: true,
      aliases: ["recipient"],
      summary:
        "One or more recipient ids or JSON recipient objects for this workflow run, separated by comma.",
    }),
    actor: maybeJsonStr({
      summary: "An actor id or JSON object for the workflow run.",
    }),
    tenant: Flags.string({
      summary: "A tenant id for the workflow run.",
    }),
    data: jsonStr({
      summary: "A JSON string of the data for this workflow",
    }),
  };

  static args = {
    workflowKey: Args.string({
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    const resp = await withSpinner<ApiV1.RehearseWorkflowResp>(
      () => this.apiV1.runWorkflow(this.props),
      { action: "‣ Running" },
    );

    this.log(
      `‣ Successfully ran \`${args.workflowKey}\` workflow in \`${flags.environment}\` environment`,
    );
    this.log(indentString(`Workflow run id: ${resp.data.workflow_run_id}`, 4));
  }
}
