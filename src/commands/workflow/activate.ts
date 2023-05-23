import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { booleanStr } from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class WorkflowActivate extends BaseCommand<
  typeof WorkflowActivate
> {
  static summary = "Activate or deactivate a workflow in a given environment.";

  static description = `
This immediately enables or disables a workflow in a given environment without
needing to go through environment promotion.

By default, this command activates a given workflow. Pass in the --status flag
with \`false\` in order to deactivate it.
`.trim();

  static flags = {
    // Do not default to any env for this command, since this action runs
    // directly in each environment outside the commit and promote flow.
    environment: Flags.string({
      required: true,
      summary: "The environment to use.",
    }),
    status: booleanStr({
      default: true,
      summary: "The workflow active status to set.",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  // static args = [{ name: "workflowKey", required: true }];
  static args = {
    workflowKey: Args.string({
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    // 1. Confirm before activating or deactivating the workflow, unless forced.
    const action = flags.status ? "Activate" : "Deactivate";
    const prompt = `${action} \`${args.workflowKey}\` workflow in \`${flags.environment}\` environment?`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    // 2. Proceed to make a request to set the workflow status.
    const actioning = flags.status ? "Activating" : "Deactivating";
    await withSpinner<ApiV1.ActivateWorkflowResp>(
      () => {
        return this.apiV1.activateWorkflow(this.props);
      },
      { action: `‣ ${actioning}` },
    );

    const actioned = flags.status ? "activated" : "deactivated";
    this.log(
      `‣ Successfully ${actioned} \`${args.workflowKey}\` workflow in \`${flags.environment}\` environment`,
    );
  }
}
