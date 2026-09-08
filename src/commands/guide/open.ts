import { Args, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { browser } from "@/lib/helpers/browser";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { viewGuideUrl } from "@/lib/urls";

export default class GuideOpen extends BaseCommand<typeof GuideOpen> {
  static summary = "Open a guide in the Knock dashboard.";

  static flags = {
    environment: CustomFlags.environment,
    branch: CustomFlags.branch,
  };

  static args = {
    guideKey: Args.string({
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
    const { guideKey } = this.props.args;
    const { environment, branch } = this.props.flags;

    const envOrBranch =
      branch ?? environment ?? (await this.apiV1.getDefaultEnvironmentSlug());

    const url = viewGuideUrl(
      this.sessionContext.dashboardOrigin,
      account_slug,
      envOrBranch,
      guideKey,
    );

    this.log(`‣ Opening guide \`${guideKey}\` in the Knock dashboard...`);
    this.log(`  ${url}`);

    await browser.openUrl(url);
  }
}
