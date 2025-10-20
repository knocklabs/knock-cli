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
import * as Guide from "@/lib/marshal/guide";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import GuideValidate from "./validate";

export default class GuidePush extends BaseCommand<typeof GuidePush> {
  static summary = "Push one or more guides from a local file system to Knock.";

  static flags = {
    environment: Flags.string({
      summary: "The environment to push the guide to. Defaults to development.",
      default: KnockEnv.Development,
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to push all guides from the target directory.",
    }),
    "guides-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all guides to push.",
      dependsOn: ["all"],
    }),
    commit: Flags.boolean({
      summary: "Push and commit the guide(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
  };

  static args = {
    guideKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // 1. First read all guide directories found for the given command.
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

    // 2. Then validate them all ahead of pushing them.
    spinner.start(`‣ Validating`);

    const apiErrors = await GuideValidate.validateAll(
      this.apiV1,
      this.props as any, // Type assertion needed since validateAll expects GuideValidate props
      guides,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    // 3. Finally push up each guide, abort on the first error.
    spinner.start(`‣ Pushing`);

    for (const guide of guides) {
      const props = merge(this.props, { flags: { annotate: true } });

      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertGuide<WithAnnotation>(props, {
        ...guide.content,
        key: guide.key,
      });

      if (isSuccessResp(resp)) {
        // Update the guide directory with the successfully pushed guide
        // payload from the server.
        // eslint-disable-next-line no-await-in-loop
        await Guide.writeGuideDirFromData(guide, resp.data.guide!);
        continue;
      }

      const error = new SourceError(
        formatErrorRespMessage(resp),
        Guide.guideJsonPath(guide),
        "ApiError",
      );

      this.error(formatError(error));
    }

    spinner.stop();

    // 4. Display a success message.
    const guideKeys = guides.map((g) => g.key);
    const actioned = flags.commit ? "pushed and committed" : "pushed";

    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${actioned} ${guides.length} guide(s) to ${scope}:\n` +
        indentString(guideKeys.join("\n"), 4),
    );
  }
}
