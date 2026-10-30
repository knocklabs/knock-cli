import { Args, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { browser } from "@/lib/helpers/browser";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { viewWarehouseSyncUrl } from "@/lib/urls";

export default class WarehouseSyncOpen extends BaseCommand<
  typeof WarehouseSyncOpen
> {
  static summary = "Open a warehouse sync in the Knock dashboard.";

  // Hidden until warehouse syncs are generally available.
  static hidden = true;

  static flags = {
    environment: CustomFlags.environment,
  };

  static args = {
    warehouseSyncKey: Args.string({
      required: true,
    }),
  };

  async run(): Promise<void> {
    const whoamiResp = await this.apiV1.whoami();

    if (!isSuccessResp(whoamiResp)) {
      const message = formatErrorRespMessage(whoamiResp);
      ux.error(new ApiError(message));
    }

    // The dashboard URL has the sync's warehouse in it.
    const syncResp = await this.apiV1.getWarehouseSync(this.props);

    if (!isSuccessResp(syncResp)) {
      const message = formatErrorRespMessage(syncResp);
      ux.error(new ApiError(message));
    }

    const { account_slug } = whoamiResp.data;
    const { warehouseSyncKey } = this.props.args;

    const url = viewWarehouseSyncUrl(
      this.sessionContext.dashboardOrigin,
      account_slug,
      syncResp.data.environment,
      syncResp.data,
    );

    this.log(
      `‣ Opening warehouse sync \`${warehouseSyncKey}\` in the Knock dashboard...`,
    );
    this.log(`  ${url}`);

    await browser.openUrl(url);
  }
}
