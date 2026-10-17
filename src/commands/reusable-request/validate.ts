import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as ReusableRequest from "@/lib/marshal/reusable-request";

export default class ReusableRequestValidate extends BaseCommand<
  typeof ReusableRequestValidate
> {
  static summary =
    "Validate one or more reusable requests from a local file system.";

  static flags = {
    environment: CustomFlags.environment,
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary:
        "Whether to validate all reusable requests from the target directory.",
    }),
    "reusable-requests-dir": CustomFlags.dirPath({
      summary:
        "The target directory path to find all reusable requests to validate.",
      dependsOn: ["all"],
    }),
  };

  static args = {
    reusableRequestKey: Args.string({
      required: false,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<{ keys: string[] } | void> {
    const target = await ReusableRequest.ensureValidCommandTarget(
      this.props,
      this.runContext,
      this.projectConfig,
    );

    const [reusableRequests, readErrors] =
      await ReusableRequest.readAllForCommandTarget(target);

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (reusableRequests.length === 0) {
      this.error(
        `No reusable request directories found in ${target.context.abspath}`,
      );
    }

    spinner.start(`‣ Validating`);

    const apiErrors = await ReusableRequestValidate.validateAll(
      this.apiV1,
      this.props,
      reusableRequests,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    const keys = reusableRequests.map((reusableRequest) => reusableRequest.key);
    const scope = formatCommandScope({ ...this.props.flags });

    if (this.props.flags.json) return { keys };

    this.log(
      `‣ Successfully validated ${reusableRequests.length} reusable request(s) using ${scope}:\n` +
        indentString(keys.join("\n"), 4),
    );
  }

  static async validateAll(
    api: ApiV1.T,
    props: Props<typeof ReusableRequestValidate>,
    reusableRequests: ReusableRequest.ReusableRequestDirData[],
  ): Promise<SourceError[]> {
    const errorPromises = reusableRequests.map(async (reusableRequest) => {
      const resp = await api.validateReusableRequest(props, {
        ...reusableRequest.content,
        key: reusableRequest.key,
      });

      if (isSuccessResp(resp)) return;

      return new SourceError(
        formatErrorRespMessage(resp),
        ReusableRequest.reusableRequestJsonPath(reusableRequest),
        "ApiError",
      );
    });

    const errors = (await Promise.all(errorPromises)).filter(
      (error): error is Exclude<typeof error, undefined> => Boolean(error),
    );

    return errors;
  }
}
