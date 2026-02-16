import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatError, formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as Broadcast from "@/lib/marshal/broadcast";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import BroadcastValidate from "./validate";

export default class BroadcastPush extends BaseCommand<typeof BroadcastPush> {
  static summary =
    "Push one or more broadcasts from a local file system to Knock.";

  static flags = {
    environment: Flags.string({
      summary:
        "The environment to push the broadcast to. Defaults to development.",
      default: KnockEnv.Development,
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to push all broadcasts from the target directory.",
    }),
    "broadcasts-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all broadcasts to push.",
      dependsOn: ["all"],
    }),
  };

  static args = {
    broadcastKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

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
      this.props as any,
      broadcasts,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    spinner.start(`‣ Pushing`);

    for (const broadcast of broadcasts) {
      const props = merge(this.props, { flags: { annotate: true } });

      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertBroadcast<WithAnnotation>(props, {
        ...broadcast.content,
        key: broadcast.key,
      });

      if (isSuccessResp(resp)) {
        // eslint-disable-next-line no-await-in-loop
        await Broadcast.writeBroadcastDirFromData(
          broadcast,
          resp.data.broadcast!,
          {
            withSchema: true,
          },
        );
        continue;
      }

      const error = new SourceError(
        formatErrorRespMessage(resp),
        Broadcast.broadcastJsonPath(broadcast),
        "ApiError",
      );

      this.error(formatError(error));
    }

    spinner.stop();

    const broadcastKeys = broadcasts.map((b) => b.key);
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully pushed ${broadcasts.length} broadcast(s) to ${scope}:\n` +
        indentString(broadcastKeys.join("\n"), 4),
    );
  }
}
