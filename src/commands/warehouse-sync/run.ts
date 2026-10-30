import { Args } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import * as CustomFlags from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";

export default class WarehouseSyncRun extends BaseCommand<
  typeof WarehouseSyncRun
> {
  static summary =
    "Run a published warehouse sync now, instead of waiting for its schedule.";

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

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.RunWarehouseSyncResp | void> {
    const { args, flags } = this.props;

    const resp = await withSpinner<ApiV1.RunWarehouseSyncResp>(() =>
      this.apiV1.runWarehouseSync(this.props),
    );

    if (flags.json) return resp.data;

    const scope = formatCommandScope(flags);
    this.log(
      `‣ Started a run of warehouse sync \`${args.warehouseSyncKey}\` in ${scope}. ` +
        `See its progress with \`knock warehouse-sync runs ${args.warehouseSyncKey}\`.`,
    );
  }
}
