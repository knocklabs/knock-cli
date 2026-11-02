import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";
import { formatSource, formatTarget } from "@/lib/marshal/warehouse-sync";

export default class WarehouseSyncGet extends BaseCommand<
  typeof WarehouseSyncGet
> {
  static summary = "Display a single warehouse sync from an environment.";

  // Hidden until warehouse syncs are generally available.
  static hidden = true;

  static flags = {
    environment: CustomFlags.environment,
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
  };

  static args = {
    warehouseSyncKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetWarehouseSyncResp | void> {
    spinner.start("‣ Loading");

    const resp = await this.apiV1.getWarehouseSync(this.props);

    spinner.stop();

    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      ux.error(new ApiError(message));
    }

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  render(sync: ApiV1.GetWarehouseSyncResp): void {
    const { warehouseSyncKey } = this.props.args;

    const scope = formatCommandScope(this.props.flags);
    this.log(`‣ Showing warehouse sync \`${warehouseSyncKey}\` in ${scope}\n`);

    const rows = [
      { key: "Name", value: sync.name },
      { key: "Key", value: sync.key },
      { key: "Description", value: sync.description || "-" },
      { key: "Status", value: sync.status },
      { key: "Warehouse", value: sync.warehouse_key },
      { key: "Target", value: formatTarget(sync) },
      { key: "Source", value: formatSource(sync) },
      { key: "Primary key column", value: sync.primary_key_column || "-" },
      { key: "Enabled", value: sync.enabled ? "Yes" : "No" },
      { key: "Frequency (minutes)", value: String(sync.frequency_minutes) },
      {
        key: "Unpublished changes",
        value: sync.has_unpublished_changes ? "Yes" : "No",
      },
      {
        key: "Last published at",
        value: sync.last_published_at
          ? formatDateTime(sync.last_published_at)
          : "-",
      },
      { key: "Publish error", value: sync.publish_error || "-" },
      {
        key: "Last failure",
        value: sync.last_failure
          ? `${sync.last_failure.stage}: ${sync.last_failure.message}`
          : "-",
      },
      { key: "Created at", value: formatDateTime(sync.created_at) },
      { key: "Updated at", value: formatDateTime(sync.updated_at) },
    ];

    ux.table(rows, {
      key: {
        header: "Warehouse sync",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 24,
      },
    });

    if (sync.source?.mode === "sql" && sync.source.query) {
      this.log(`\nQuery:\n${sync.source.query}`);
    }

    if (sync.mappings.length > 0) {
      this.log("");

      ux.table(sync.mappings, {
        source_column: {
          header: "Column",
        },
        target_field: {
          header: "Field",
        },
        on_null: {
          header: "On null",
          get: (mapping) => mapping.on_null ?? "-",
        },
      });
    }
  }
}
