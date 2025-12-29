import { Args, Flags, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { browser } from "@/lib/helpers/browser";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { viewMessageTypeUrl } from "@/lib/urls";

export default class MessageTypeOpen extends BaseCommand<
  typeof MessageTypeOpen
> {
  static summary = "Open a message type in the Knock dashboard.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
  };

  static args = {
    messageTypeKey: Args.string({
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
    const { messageTypeKey } = this.props.args;
    const { environment, branch } = this.props.flags;

    const envOrBranch = branch ?? environment;

    const url = viewMessageTypeUrl(
      this.sessionContext.dashboardOrigin,
      account_slug,
      envOrBranch,
      messageTypeKey,
    );

    this.log(
      `‣ Opening message type \`${messageTypeKey}\` in the Knock dashboard...`,
    );
    this.log(`  ${url}`);

    await browser.openUrl(url);
  }
}
