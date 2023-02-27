import { Flags } from "@oclif/core";
import enquirer from "enquirer";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { booleanStr } from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object";
import { withSpinner } from "@/lib/helpers/request";

const promptToConfirm = async ({
  flags,
  args,
}: Props): Promise<string | undefined> => {
  const action = flags.status ? "Activate" : "Deactivate";

  try {
    const { input } = await enquirer.prompt<{ input: string }>({
      type: "confirm",
      name: "input",
      message: `${action} \`${args.workflowKey}\` workflow in \`${flags.environment}\` environment?`,
    });
    return input;
  } catch (error) {
    console.log(error);
  }
};

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

    // 1. Fetch first to ensure a published workflow exists in the target env.
    const resp = await withSpinner<ApiV1.GetWorkflowResp>(() => {
      const props = merge(this.props, {
        flags: { "hide-uncommitted-changes": true },
      });
      return this.apiV1.getWorkflow(props);
    });

    // 2. If forced, proceed to make the request right away.
    if (flags.force) return this.activateWorkflow();

    // 3. If the publisehd workflow is already set to the target status, noop.
    if (resp.data.active === flags.status) {
      const value = flags.status ? "active" : "inactive";
      return this.log(
        `‣ Confirmed the \`${args.workflowKey}\` workflow is set to \`${value}\` in \`${flags.environment}\` environment`,
      );
    }

    // 4. Confirm before activating or deactivating the workflow.
    const input = await promptToConfirm(this.props);
    if (!input) return;

    return this.activateWorkflow();
  }

  async activateWorkflow(): Promise<void> {
    const { args, flags } = this.props;
    const actioning = flags.status ? "Activating" : "Deactivating";

    await withSpinner<ApiV1.ActivateWorkflowResp>(
      () => {
        return this.apiV1.activateWorkflow(this.props);
      },
      { action: `‣ ${actioning}` },
    );

    const actioned = flags.status ? "activated" : "deactivated";
    this.log(
      `‣ Successfully ${actioned} the \`${args.workflowKey}\` workflow in \`${flags.environment}\` environment`,
    );
  }
}
