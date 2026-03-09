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
import * as Audience from "@/lib/marshal/audience";

import AudiencePush from "./push";

export default class AudienceValidate extends BaseCommand<
  typeof AudienceValidate
> {
  static summary = "Validate one or more audiences from a local file system.";

  static flags = {
    environment: Flags.string({
      summary:
        "Validating an audience is only done in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to validate all audiences from the target directory.",
    }),
    "audiences-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all audiences to validate.",
      dependsOn: ["all"],
    }),
  };

  static args = {
    audienceKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    // 1. Read all audience directories found for the given command.
    const target = await Audience.ensureValidCommandTarget(
      this.props,
      this.runContext,
      this.projectConfig,
    );

    const [audiences, readErrors] = await Audience.readAllForCommandTarget(
      target,
    );

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (audiences.length === 0) {
      this.error(`No audience directories found in ${target.context.abspath}`);
    }

    // 2. Validate each audience data.
    spinner.start(`‣ Validating`);

    const apiErrors = await AudienceValidate.validateAll(
      this.apiV1,
      this.props,
      audiences,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    // 3. Display a success message.
    const audienceKeys = audiences.map((a) => a.key);
    const scope = formatCommandScope({ ...this.props.flags });
    this.log(
      `‣ Successfully validated ${audiences.length} audience(s) using ${scope}:\n` +
        indentString(audienceKeys.join("\n"), 4),
    );
  }

  static async validateAll(
    api: ApiV1.T,
    props: Props<typeof AudienceValidate | typeof AudiencePush>,
    audiences: Audience.AudienceDirData[],
  ): Promise<SourceError[]> {
    // TODO: Throw an error if a non validation error (e.g. authentication error)
    // instead of printing out same error messages repeatedly.

    const errorPromises = audiences.map(async (audience) => {
      const resp = await api.validateAudience(props, {
        ...audience.content,
        key: audience.key,
      });

      if (isSuccessResp(resp)) return;

      const error = new SourceError(
        formatErrorRespMessage(resp),
        Audience.audienceJsonPath(audience),
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
