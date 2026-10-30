import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as WarehouseSync from "@/lib/marshal/warehouse-sync";

import WarehouseSyncPush from "./push";

export default class WarehouseSyncValidate extends BaseCommand<
  typeof WarehouseSyncValidate
> {
  static summary =
    "Validate one or more warehouse syncs from a local file system.";

  // Hidden until warehouse syncs are generally available.
  static hidden = true;

  static flags = {
    environment: CustomFlags.environment,
    all: Flags.boolean({
      summary:
        "Whether to validate all warehouse syncs in the target directory.",
    }),
    "warehouse-syncs-dir": CustomFlags.dirPath({
      summary:
        "The target directory path to find all warehouse syncs to validate.",
      dependsOn: ["all"],
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

    const keys = warehouseSyncs.map((s) => s.key);
    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Successfully validated ${warehouseSyncs.length} warehouse sync(s) in ${scope}:\n` +
        indentString(keys.join("\n"), 4),
    );
  }

  static async validateAll(
    api: ApiV1.T,
    props: Props<typeof WarehouseSyncValidate | typeof WarehouseSyncPush>,
    warehouseSyncs: WarehouseSync.WarehouseSyncDirData[],
  ): Promise<SourceError[]> {
    const errorPromises = warehouseSyncs.map(async (warehouseSync) => {
      const resp = await api.validateWarehouseSync(
        props,
        WarehouseSync.toWarehouseSyncInput(
          warehouseSync.key,
          warehouseSync.content,
        ),
      );

      if (isSuccessResp(resp)) return;

      return new SourceError(
        formatErrorRespMessage(resp),
        WarehouseSync.warehouseSyncJsonPath(warehouseSync),
        "ApiError",
      );
    });

    const errors = (await Promise.all(errorPromises)).filter(
      (e): e is Exclude<typeof e, undefined> => Boolean(e),
    );

    return errors;
  }
}
