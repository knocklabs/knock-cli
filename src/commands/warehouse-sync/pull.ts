import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { MAX_PAGINATION_LIMIT, PageInfo } from "@/lib/helpers/page";
import {
  formatErrorRespMessage,
  isSuccessResp,
  withSpinner,
} from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as WarehouseSync from "@/lib/marshal/warehouse-sync";
import { WarehouseSyncDirContext } from "@/lib/run-context";

export default class WarehouseSyncPull extends BaseCommand<
  typeof WarehouseSyncPull
> {
  static summary =
    "Pull one or more warehouse syncs from an environment into a local file system.";

  // Hidden until warehouse syncs are generally available.
  static hidden = true;

  static flags = {
    environment: CustomFlags.environment,
    all: Flags.boolean({
      summary:
        "Whether to pull all warehouse syncs from the specified environment.",
    }),
    "warehouse-syncs-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all warehouse syncs into.",
      dependsOn: ["all"],
    }),
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  static args = {
    warehouseSyncKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const target = await WarehouseSync.ensureValidCommandTarget(
      this.props,
      this.runContext,
      this.projectConfig,
    );

    return target.type === "warehouseSyncDir"
      ? this.pullOneWarehouseSync(target.context)
      : this.pullAllWarehouseSyncs(target.context);
  }

  async pullOneWarehouseSync(
    dirContext: WarehouseSyncDirContext,
  ): Promise<void> {
    const { flags } = this.props;

    if (dirContext.exists) {
      this.log(`‣ Found \`${dirContext.key}\` at ${dirContext.abspath}`);
    } else {
      const prompt = `Create a new warehouse sync directory \`${dirContext.key}\` at ${dirContext.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    }

    const resp = await withSpinner<ApiV1.GetWarehouseSyncResp>(() => {
      const props = merge(this.props, {
        args: { warehouseSyncKey: dirContext.key },
      });
      return this.apiV1.getWarehouseSync(props);
    });

    await WarehouseSync.writeWarehouseSyncDirFromData(dirContext, resp.data);

    const action = dirContext.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath} using ${scope}`,
    );
  }

  async pullAllWarehouseSyncs(
    targetDirCtx: WarehouseSync.WarehouseSyncCommandTarget["context"],
  ): Promise<void> {
    const { flags } = this.props;

    const prompt = targetDirCtx.exists
      ? `Pull latest warehouse syncs into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new warehouse syncs directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    spinner.start(`‣ Loading`);

    const warehouseSyncs = await this.listAllWarehouseSyncs();
    await WarehouseSync.writeWarehouseSyncsIndexDir(
      targetDirCtx,
      warehouseSyncs,
    );

    spinner.stop();

    const action = targetDirCtx.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} the warehouse syncs directory at ${targetDirCtx.abspath} using ${scope}`,
    );
  }

  async listAllWarehouseSyncs(
    pageParams: Partial<PageInfo> = {},
    syncsFetchedSoFar: WarehouseSync.WarehouseSyncData[] = [],
  ): Promise<WarehouseSync.WarehouseSyncData[]> {
    const props = merge(this.props, {
      flags: { ...pageParams, limit: MAX_PAGINATION_LIMIT },
    });

    const resp = await this.apiV1.listWarehouseSyncs(props);
    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const warehouseSyncs = [...syncsFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllWarehouseSyncs({ after: pageInfo.after }, warehouseSyncs)
      : warehouseSyncs;
  }
}
