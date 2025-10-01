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
import * as Guide from "@/lib/marshal/guide";

export default class GuideValidate extends BaseCommand<typeof GuideValidate> {
  static summary = "Validate one or more guides from a local file system.";

  // Hide until guides are released in GA.
  static hidden = true;

  static flags = {
    environment: Flags.string({
      summary: "Validating a guide is only done in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to validate all guides from the target directory.",
    }),
    "guides-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all guides to validate.",
      dependsOn: ["all"],
    }),
  };

  static args = {
    guideKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    // 1. Read all guide directories found for the given command.
    const target = await Guide.ensureValidCommandTarget(
      this.props,
      this.runContext,
    );

    const [guides, readErrors] = await Guide.readAllForCommandTarget(target, {
      withExtractedFiles: true,
    });

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (guides.length === 0) {
      this.error(`No guide directories found in ${target.context.abspath}`);
    }

    // 2. Validate each guide data.
    spinner.start(`‣ Validating`);

    const apiErrors = await GuideValidate.validateAll(
      this.apiV1,
      this.props,
      guides,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    // 3. Display a success message.
    const guideKeys = guides.map((g) => g.key);
    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Successfully validated ${guides.length} guide(s) using ${scope}:\n` +
        indentString(guideKeys.join("\n"), 4),
    );
  }

  static async validateAll(
    api: ApiV1.T,
    props: Props<typeof GuideValidate>,
    guides: Guide.GuideDirData[],
  ): Promise<SourceError[]> {
    // TODO: Throw an error if a non validation error (e.g. authentication error)
    // instead of printing out same error messages repeatedly.

    const errorPromises = guides.map(async (guide) => {
      const resp = await api.validateGuide(props, {
        ...guide.content,
        key: guide.key,
      });

      if (isSuccessResp(resp)) return;

      const error = new SourceError(
        formatErrorRespMessage(resp),
        Guide.guideJsonPath(guide),
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
