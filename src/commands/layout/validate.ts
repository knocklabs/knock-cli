import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as EmailLayout from "@/lib/marshal/email-layout";

import EmailLayoutPush from "./push";

export default class EmailLayoutValidate extends BaseCommand<
  typeof EmailLayoutValidate
> {
  static aliases = ["email-layout:validate", "email_layout:validate"];

  static summary = "Validate one or more layouts from a local file system.";

  static flags = {
    environment: Flags.string({
      summary:
        "Validating a layout is only done in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    all: Flags.boolean({
      summary: "Whether to validate all layouts from the target directory.",
    }),
    "layouts-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all layouts to validate.",
      dependsOn: ["all"],
    }),
  };

  static args = {
    emailLayoutKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    // 1. Read all layout directories found for the given command.
    const target = await EmailLayout.ensureValidCommandTarget(
      this.props,
      this.runContext,
    );

    const [layouts, readErrors] = await EmailLayout.readAllForCommandTarget(
      target,
      { withExtractedFiles: true },
    );

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (layouts.length === 0) {
      this.error(`No layout directories found in ${target.context.abspath}`);
    }

    // 2. Validate each layout data
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

    // 3. Display a success message.
    const layoutsKey = layouts.map((l) => l.key);

    this.log(
      `‣ Successfully validated ${layouts.length} layout(s):\n` +
      indentString(layoutsKey.join("\n"), 4),
    );
  }
  static async validateAll(
    api: ApiV1.T,
    props: Props<typeof EmailLayoutValidate | typeof EmailLayoutPush>,
    layouts: EmailLayout.LayoutDirData[],
  ): Promise<SourceError[]> {
    const errorPromises = layouts.map(async (layout) => {
      const resp = await api.validateEmailLayout(props, {
        ...layout.content,
        key: layout.key,
      });

      if (isSuccessResp(resp)) return;

      const error = new SourceError(
        formatErrorRespMessage(resp),
        EmailLayout.emailLayoutJsonPath(layout),
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