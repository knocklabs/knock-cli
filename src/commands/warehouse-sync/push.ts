import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatError, formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as WarehouseSync from "@/lib/marshal/warehouse-sync";

import WarehouseSyncValidate from "./validate";

export default class WarehouseSyncPush extends BaseCommand<
  typeof WarehouseSyncPush
> {
  static summary =
    "Push one or more warehouse syncs from a local file system to Knock.";

  static description =
    "Saves each warehouse sync as a draft. Pass --commit to publish it too.";

  // Hidden until warehouse syncs are generally available.
  static hidden = true;

  static flags = {
    environment: CustomFlags.environment,
    all: Flags.boolean({
      summary: "Whether to push all warehouse syncs from the target directory.",
    }),
    "warehouse-syncs-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all warehouse syncs to push.",
      dependsOn: ["all"],
    }),
    commit: Flags.boolean({
      summary: "Push and publish the warehouse sync(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
  };

  static args = {
    warehouseSyncKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // 1. First read all warehouse sync directories found for the given command.
    const target = await WarehouseSync.ensureValidCommandTarget(
      this.props,
      this.runContext,
      this.projectConfig,
    );

    const [warehouseSyncs, readErrors] =
      await WarehouseSync.readAllForCommandTarget(target);

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (warehouseSyncs.length === 0) {
      this.error(
        `No warehouse sync directories found in ${target.context.abspath}`,
      );
    }

    // 2. Then validate them all ahead of pushing them.
    spinner.start(`‣ Validating`);

    const apiErrors = await WarehouseSyncValidate.validateAll(
      this.apiV1,
      this.props,
      warehouseSyncs,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    // 3. Finally push up each warehouse sync, abort on the first error.
    spinner.start(`‣ Pushing`);

    for (const warehouseSync of warehouseSyncs) {
      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertWarehouseSync(
        this.props,
        WarehouseSync.toWarehouseSyncInput(
          warehouseSync.key,
          warehouseSync.content,
        ),
      );

      if (isSuccessResp(resp)) {
        // eslint-disable-next-line no-await-in-loop
        await WarehouseSync.writeWarehouseSyncDirFromData(
          warehouseSync,
          resp.data.warehouse_sync,
        );

        continue;
      }

      const error = new SourceError(
        formatErrorRespMessage(resp),
        WarehouseSync.warehouseSyncJsonPath(warehouseSync),
        "ApiError",
      );

      this.error(formatError(error));
    }

    spinner.stop();

    // 4. Display a success message.
    const keys = warehouseSyncs.map((s) => s.key);
    const actioned = flags.commit ? "pushed and published" : "pushed";

    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${actioned} ${warehouseSyncs.length} warehouse sync(s) to ${scope}:\n` +
        indentString(keys.join("\n"), 4),
    );
  }
}
