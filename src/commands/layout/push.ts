import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatError, formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as EmailLayout from "@/lib/marshal/email-layout";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import EmailLayoutValidate from "./validate";

export default class EmailLayoutPush extends BaseCommand<
  typeof EmailLayoutPush
> {
  static aliases = ["email-layout:push", "email_layout:push"];

  static summary =
    "Push one or more email layouts from a local file system to Knock.";

  static flags = {
    environment: Flags.string({
      summary:
        "Pushing an email layout is only allowed in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    all: Flags.boolean({
      summary: "Whether to push all layouts from the target directory.",
    }),
    "layouts-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all layouts to push.",
      dependsOn: ["all"],
      aliases: ["email-layouts-dir"],
    }),
    commit: Flags.boolean({
      summary: "Push and commit the layout(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
  };

  static args = {
    emailLayoutKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // 1. First read all layout directories found for the given command.
    const target = await EmailLayout.ensureValidCommandTarget(
      this.props,
      this.runContext,
    );

    const [layouts, readErrors] = await EmailLayout.readAllForCommandTarget(
      target,
      {
        withExtractedFiles: true,
      },
    );

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (layouts.length === 0) {
      this.error(`No layout directories found in ${target.context.abspath}`);
    }

    // 2. Then validate them all ahead of pushing them.
    spinner.start(`‣ Validating`);

    const apiErrors = await EmailLayoutValidate.validateAll(
      this.apiV1,
      this.props,
      layouts,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    // 3. Finally push up each layout, abort on the first error.
    spinner.start(`‣ Pushing`);

    for (const layout of layouts) {
      const props = merge(this.props, { flags: { annotate: true } });

      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertEmailLayout<WithAnnotation>(props, {
        ...layout.content,
        key: layout.key,
      });

      if (isSuccessResp(resp)) {
        // Update the layout directory with the successfully pushed layout
        // payload from the server.
        // eslint-disable-next-line no-await-in-loop
        await EmailLayout.writeEmailLayoutDirFromData(
          layout,
          resp.data.email_layout!,
        );
        continue;
      }

      const error = new SourceError(
        formatErrorRespMessage(resp),
        EmailLayout.emailLayoutJsonPath(layout),
        "ApiError",
      );

      this.error(formatError(error));
    }

    spinner.stop();

    // 4. Display a success message.
    const layoutKeys = layouts.map((l) => l.key);
    const actioned = flags.commit ? "pushed and committed" : "pushed";

    this.log(
      `‣ Successfully ${actioned} ${layouts.length} layout(s):\n` +
        indentString(layoutKeys.join("\n"), 4),
    );
  }
}
