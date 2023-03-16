import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { booleanStr } from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class WorkflowActivate extends BaseCommand {
  static flags = {
    // Do not default to any env for this command, since this action runs
    // directly in each environment outside the commit and promote flow.
    environment: Flags.string({
      required: true,
    }),

    status: booleanStr({ default: true }),
    force: Flags.boolean(),
  };

  static args = [{ name: "workflowKey", required: true }];

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
