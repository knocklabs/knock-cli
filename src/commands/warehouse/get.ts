import { Args, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";

export default class WarehouseGet extends BaseCommand<typeof WarehouseGet> {
  static summary = "Display a single warehouse connected to your account.";

  // Hidden until warehouse syncs are generally available.
  static hidden = true;

  static flags = {
    environment: CustomFlags.environment,
  };

  static args = {
    warehouseKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetWarehouseResp | void> {
    spinner.start("‣ Loading");

    const resp = await this.apiV1.getWarehouse(this.props);

    spinner.stop();

    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      ux.error(new ApiError(message));
    }

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  render(warehouse: ApiV1.GetWarehouseResp): void {
    const { warehouseKey } = this.props.args;
    this.log(`‣ Showing warehouse \`${warehouseKey}\`\n`);

    // Public keys span several lines, so they're left to --json.
    const settings = Object.entries(warehouse.connection_settings ?? {})
      .filter(([key]) => !key.endsWith("public_key"))
      .map(([key, value]) => ({ key: `  ${key}`, value: String(value) }));

    const rows = [
      { key: "Name", value: warehouse.name },
      { key: "Key", value: warehouse.key },
      { key: "Type", value: warehouse.type },
      { key: "Connection", value: warehouse.connection_status },
      { key: "Connection error", value: warehouse.connection_error || "-" },
      {
        key: "Last tested at",
        value: warehouse.last_tested_at
          ? formatDateTime(warehouse.last_tested_at)
          : "-",
      },
      { key: "Connection settings", value: settings.length > 0 ? "" : "-" },
      ...settings,
      { key: "Created at", value: formatDateTime(warehouse.created_at) },
      { key: "Updated at", value: formatDateTime(warehouse.updated_at) },
    ];

    ux.table(rows, {
      key: {
        header: "Warehouse",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 24,
      },
    });
  }
}
