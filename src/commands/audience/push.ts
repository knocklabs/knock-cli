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
import * as Audience from "@/lib/marshal/audience";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import AudienceValidate from "./validate";

export default class AudiencePush extends BaseCommand<typeof AudiencePush> {
  static summary =
    "Push one or more audiences from a local file system to Knock.";

  static flags = {
    environment: Flags.string({
      summary:
        "Pushing an audience is only allowed in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to push all audiences from the target directory.",
    }),
    "audiences-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all audiences to push.",
      dependsOn: ["all"],
    }),
    commit: Flags.boolean({
      summary: "Push and commit the audience(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
  };

  static args = {
    audienceKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // 1. First read all audience directories found for the given command.
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

    // 2. Then validate them all ahead of pushing them.
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

    // 3. Finally push up each audience, abort on the first error.
    spinner.start(`‣ Pushing`);

    for (const audience of audiences) {
      const props = merge(this.props, { flags: { annotate: true } });

      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertAudience<WithAnnotation>(props, {
        ...audience.content,
        key: audience.key,
      });

      if (isSuccessResp(resp)) {
        // Update the audience directory with the successfully pushed audience
        // payload from the server.
        // eslint-disable-next-line no-await-in-loop
        await Audience.writeAudienceDirFromData(audience, resp.data.audience!, {
          withSchema: true,
        });

        continue;
      }

      const error = new SourceError(
        formatErrorRespMessage(resp),
        Audience.audienceJsonPath(audience),
        "ApiError",
      );

      this.error(formatError(error));
    }

    spinner.stop();

    // 4. Display a success message.
    const audienceKeys = audiences.map((a) => a.key);
    const actioned = flags.commit ? "pushed and committed" : "pushed";

    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${actioned} ${audiences.length} audience(s) to ${scope}:\n` +
        indentString(audienceKeys.join("\n"), 4),
    );
  }
}
