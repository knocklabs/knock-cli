import { Args, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";

export default class WarehouseSyncRuns extends BaseCommand<
  typeof WarehouseSyncRuns
> {
  static summary = "Display the most recent runs of a warehouse sync.";

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

  async run(): Promise<ApiV1.ListWarehouseSyncRunResp | void> {
    spinner.start("‣ Loading");

    const resp = await this.apiV1.listWarehouseSyncRuns(this.props);

    spinner.stop();

    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      ux.error(new ApiError(message));
    }

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  render(data: ApiV1.ListWarehouseSyncRunResp): void {
    const { entries } = data;
    const { warehouseSyncKey } = this.props.args;

    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Showing ${entries.length} runs of warehouse sync \`${warehouseSyncKey}\` in ${scope}\n`,
    );

    ux.table(entries, {
      id: {
        header: "Run ID",
      },
      status: {
        header: "Status",
      },
      started_at: {
        header: "Started at",
        get: (entry) =>
          entry.started_at ? formatDateTime(entry.started_at) : "-",
      },
      rows_applied: {
        header: "Rows synced",
        get: (entry) => entry.rows_applied ?? "-",
      },
      rows_failed: {
        header: "Rows failed",
        get: (entry) => entry.rows_failed ?? "-",
      },
      error: {
        header: "Error",
        get: (entry) => entry.error?.message ?? "-",
      },
    });
  }
}
