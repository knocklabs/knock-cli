import { Args, Flags, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { browser } from "@/lib/helpers/browser";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { viewWorkflowUrl } from "@/lib/urls";

export default class WorkflowOpen extends BaseCommand<typeof WorkflowOpen> {
  static summary = "Open a workflow in the Knock dashboard.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
  };

  static args = {
    workflowKey: Args.string({
      required: true,
    }),
  };

  async run(): Promise<void> {
    const whoamiResp = await this.apiV1.whoami();

    if (!isSuccessResp(whoamiResp)) {
      const message = formatErrorRespMessage(whoamiResp);
      ux.error(new ApiError(message));
    }

    const { account_slug } = whoamiResp.data;
    const { workflowKey } = this.props.args;
    const { environment, branch } = this.props.flags;

    const envOrBranch = branch ?? environment;

    const url = viewWorkflowUrl(
      this.sessionContext.dashboardOrigin,
      account_slug,
      envOrBranch,
      workflowKey,
    );

    this.log(`‣ Opening workflow \`${workflowKey}\` in the Knock dashboard...`);
    this.log(`  ${url}`);

    await browser.openUrl(url);
  }
}
