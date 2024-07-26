import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatError, formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as Partial from "@/lib/marshal/partial";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import PartialValidate from "./validate";

export default class PartialPush extends BaseCommand<typeof PartialPush> {
  static summary =
    "Push one or more partials from a local file system to Knock.";

  static flags = {
    environment: Flags.string({
      summary:
        "Pushing a partial is only allowed in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    all: Flags.boolean({
      summary: "Whether to push all partials from the target directory.",
    }),
    "partials-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all partials to push.",
      dependsOn: ["all"],
    }),
    commit: Flags.boolean({
      summary: "Push and commit the partial(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
  };

  static args = {
    partialKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // 1. First read all partial directories found for the given command.
    const target = await Partial.ensureValidCommandTarget(
      this.props,
      this.runContext,
    );

    const [partials, readErrors] = await Partial.readAllForCommandTarget(
      target,
      {
        withExtractedFiles: true,
      },
    );

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (partials.length === 0) {
      this.error(`No partial directories found in ${target.context.abspath}`);
    }

    // 2. Then validate them all ahead of pushing them.
    spinner.start(`‣ Validating`);

    const apiErrors = await PartialValidate.validateAll(
      this.apiV1,
      this.props,
      partials,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    // 3. Finally push up each partial, abort on the first error.
    spinner.start(`‣ Pushing`);

    for (const partial of partials) {
      const props = merge(this.props, { flags: { annotate: true } });

      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertPartial<WithAnnotation>(props, {
        ...partial.content,
        key: partial.key,
      });

      if (isSuccessResp(resp)) {
        // Update the partial directory with the successfully pushed partial
        // payload from the server.
        // eslint-disable-next-line no-await-in-loop
        await Partial.writePartialDirFromData(partial, resp.data.partial!);
        continue;
      }

      const error = new SourceError(
        formatErrorRespMessage(resp),
        Partial.partialJsonPath(partial),
        "ApiError",
      );

      this.error(formatError(error));
    }

    spinner.stop();

    // 4. Display a success message.
    const partialKeys = partials.map((l) => l.key);
    const actioned = flags.commit ? "pushed and committed" : "pushed";

    this.log(
      `‣ Successfully ${actioned} ${partials.length} partial(s):\n` +
        indentString(partialKeys.join("\n"), 4),
    );
  }
}
