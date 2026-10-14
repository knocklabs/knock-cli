import { Args, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { browser } from "@/lib/helpers/browser";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { viewGoalUrl } from "@/lib/urls";

export default class GoalOpen extends BaseCommand<typeof GoalOpen> {
  static summary = "Open a goal in the Knock dashboard.";

  static flags = {
    environment: CustomFlags.environment,
  };

  static args = {
    goalKey: Args.string({
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
    const { goalKey } = this.props.args;
    const { environment } = this.props.flags;

    const envSlug =
      environment ?? (await this.apiV1.getDefaultEnvironmentSlug());

    const url = viewGoalUrl(
      this.sessionContext.dashboardOrigin,
      account_slug,
      envSlug,
      goalKey,
    );

    this.log(`‣ Opening goal \`${goalKey}\` in the Knock dashboard...`);
    this.log(`  ${url}`);

    await browser.openUrl(url);
  }
}
