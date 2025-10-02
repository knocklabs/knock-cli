import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import * as CustomFlags from "@/lib/helpers/flag";
import { jsonStr, maybeJsonStr, maybeJsonStrAsList } from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";

export default class WorkflowRun extends BaseCommand<typeof WorkflowRun> {
  static summary = "Test run a workflow using the latest version from Knock.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment in which to run the workflow",
    }),
    branch: CustomFlags.branch,
    recipients: maybeJsonStrAsList({
      required: true,
      aliases: ["recipient"],
      summary:
        "One or more recipient user ids separated by comma, or a JSON string containing one or more recipient object references for this workflow run.",
    }),
    actor: maybeJsonStr({
      summary:
        "An actor id, or a JSON string of an actor object reference for the workflow run.",
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

    const scope = formatCommandScope(flags);
    this.log(`‣ Successfully ran \`${args.workflowKey}\` workflow in ${scope}`);
    this.log(indentString(`Workflow run id: ${resp.data.workflow_run_id}`, 4));
  }
}
