import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatError, formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as ReusableRequest from "@/lib/marshal/reusable-request";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import ReusableRequestValidate from "./validate";

export default class ReusableRequestPush extends BaseCommand<
  typeof ReusableRequestPush
> {
  static summary =
    "Push one or more reusable requests from a local file system to Knock.";

  static flags = {
    environment: CustomFlags.environment,
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary:
        "Whether to push all reusable requests from the target directory.",
    }),
    "reusable-requests-dir": CustomFlags.dirPath({
      summary:
        "The target directory path to find all reusable requests to push.",
      dependsOn: ["all"],
    }),
    commit: Flags.boolean({
      summary: "Push and commit the reusable request(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
    "allow-empty": CustomFlags.allowEmptyOnPush,
    force: CustomFlags.force,
  };

  static args = {
    reusableRequestKey: Args.string({
      required: false,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<{ keys: string[] } | void> {
    const { flags } = this.props;

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

    spinner.start(`‣ Pushing`);

    for (const reusableRequest of reusableRequests) {
      const props = merge(this.props, { flags: { annotate: true } });

      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertReusableRequest<WithAnnotation>(
        props,
        {
          ...reusableRequest.content,
          key: reusableRequest.key,
        },
      );

      if (isSuccessResp(resp) && resp.data.reusable_request) {
        // eslint-disable-next-line no-await-in-loop
        await ReusableRequest.writeReusableRequestDirFromData(
          reusableRequest,
          resp.data.reusable_request,
        );

        continue;
      }

      const error = new SourceError(
        isSuccessResp(resp)
          ? "Reusable request response did not include reusable_request"
          : formatErrorRespMessage(resp),
        ReusableRequest.reusableRequestJsonPath(reusableRequest),
        "ApiError",
      );

      this.error(formatError(error));
    }

    spinner.stop();

    const keys = reusableRequests.map((reusableRequest) => reusableRequest.key);
    const actioned = flags.commit ? "pushed and committed" : "pushed";
    const scope = formatCommandScope(flags);

    if (flags.json) return { keys };

    this.log(
      `‣ Successfully ${actioned} ${reusableRequests.length} reusable request(s) to ${scope}:\n` +
        indentString(keys.join("\n"), 4),
    );
  }
}
