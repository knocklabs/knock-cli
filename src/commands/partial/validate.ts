import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as Partial from "@/lib/marshal/partial";

import PartialPush from "./push";

export default class PartialValidate extends BaseCommand<
  typeof PartialValidate
> {
  static summary = "Validate one or more partials from a local file system.";

  static flags = {
    environment: Flags.string({
      summary:
        "Validating a partial is only done in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    all: Flags.boolean({
      summary: "Whether to validate all partials from the target directory.",
    }),
    "partials-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all partials to validate.",
      dependsOn: ["all"],
    }),
  };

  static args = {
    partialKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    // 1. Read all partial directories found for the given command.
    const target = await Partial.ensureValidCommandTarget(
      this.props,
      this.runContext,
    );

    const [partials, readErrors] = await Partial.readAllForCommandTarget(
      target,
      { withExtractedFiles: true },
    );

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (partials.length === 0) {
      this.error(`No partial directories found in ${target.context.abspath}`);
    }

    // 2. Validate each partial data.
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

    // 3. Display a success message.
    const partialKeys = partials.map((p) => p.key);
    this.log(
      `‣ Successfully validated ${partials.length} partial(s):\n` +
        indentString(partialKeys.join("\n"), 4),
    );
  }

  static async validateAll(
    api: ApiV1.T,
    props: Props<typeof PartialValidate | typeof PartialPush>,
    partials: Partial.PartialDirData[],
  ): Promise<SourceError[]> {
    // TODO: Throw an error if a non validation error (e.g. authentication error)
    // instead of printing out same error messages repeatedly.

    const errorPromises = partials.map(async (partial) => {
      const resp = await api.validatePartial(props, {
        ...partial.content,
        key: partial.key,
      });

      if (isSuccessResp(resp)) return;

      const error = new SourceError(
        formatErrorRespMessage(resp),
        Partial.partialJsonPath(partial),
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
