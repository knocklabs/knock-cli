import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as Broadcast from "@/lib/marshal/broadcast";

export default class BroadcastValidate extends BaseCommand<
  typeof BroadcastValidate
> {
  static summary = "Validate one or more broadcasts from a local file system.";

  static flags = {
    environment: Flags.string({
      summary:
        "The environment to validate the broadcast in. Defaults to development.",
      default: KnockEnv.Development,
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to validate all broadcasts from the target directory.",
    }),
    "broadcasts-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all broadcasts to validate.",
      dependsOn: ["all"],
    }),
  };

  static args = {
    broadcastKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const target = await Broadcast.ensureValidCommandTarget(
      this.props,
      this.runContext,
      this.projectConfig,
    );

    const [broadcasts, readErrors] = await Broadcast.readAllForCommandTarget(
      target,
      {
        withExtractedFiles: true,
      },
    );

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (broadcasts.length === 0) {
      this.error(`No broadcast directories found in ${target.context.abspath}`);
    }

    spinner.start(`‣ Validating`);

    const apiErrors = await BroadcastValidate.validateAll(
      this.apiV1,
      this.props,
      broadcasts,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    const broadcastKeys = broadcasts.map((b) => b.key);
    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Successfully validated ${broadcasts.length} broadcast(s) using ${scope}:\n` +
        indentString(broadcastKeys.join("\n"), 4),
    );
  }

  static async validateAll(
    api: ApiV1.T,
    props: Props<typeof BroadcastValidate>,
    broadcasts: Broadcast.BroadcastDirData[],
  ): Promise<SourceError[]> {
    const errorPromises = broadcasts.map(async (broadcast) => {
      const resp = await api.validateBroadcast(props, {
        ...broadcast.content,
        key: broadcast.key,
      });

      if (isSuccessResp(resp)) return;

      const error = new SourceError(
        formatErrorRespMessage(resp),
        Broadcast.broadcastJsonPath(broadcast),
        "ApiError",
      );
      return error;
    });

    const errors = (await Promise.all(errorPromises)).filter(
      (e): e is Exclude<typeof e, undefined> => Boolean(e),
    );

    return errors;
  }
}
