import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as Translation from "@/lib/marshal/translation";

export default class TranslationValidate extends BaseCommand {
  static summary =
    "Validate one or more translations from a local file system.";

  static description = Translation.translationRefDescription;

  static flags = {
    environment: Flags.string({
      summary:
        "Validating a translation is only done in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    all: Flags.boolean({
      summary:
        "Whether to validate all translations from the target directory.",
    }),
    "translations-dir": CustomFlags.dirPath({
      summary:
        "The target directory path to find all translations to validate.",
      dependsOn: ["all"],
    }),
  };

  static args = [{ name: "translationRef", required: false }];

  async run(): Promise<void> {
    const target = await Translation.ensureValidCommandTarget(
      this.props,
      this.runContext,
    );
    const [translations, readErrors] =
      await Translation.readAllForCommandTarget(target);

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (translations.length === 0) {
      this.error(`No translation files found in ${target.context.abspath}`);
    }

    spinner.start(`‣ Validating`);

    const apiErrors = await TranslationValidate.validateAll(
      this.apiV1,
      this.props,
      translations,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors, { prependBy: "\n\n" }));
    }

    spinner.stop();

    const handledRefs = translations.map((t) => t.ref);
    this.log(
      `‣ Successfully validated ${translations.length} translation(s):\n` +
        indentString(handledRefs.join("\n"), 4),
    );
  }

  static async validateAll(
    api: ApiV1.T,
    props: Props,
    translations: Translation.TranslationFileData[],
  ): Promise<SourceError[]> {
    // TODO: Throw if a non validation error (e.g. authentication error) instead
    // of printing out same error messages repeatedly.

    const errorPromises = translations.map(async (translation) => {
      const resp = await api.validateTranslation(props, {
        locale_code: translation.localeCode,
        namespace: translation.namespace,
        content: translation.content,
      });

      if (isSuccessResp(resp)) return;

      const message = formatErrorRespMessage(resp);
      return new SourceError(message, translation.abspath, "ApiError");
    });

    const errors = (await Promise.all(errorPromises)).filter(
      (e): e is Exclude<typeof e, undefined> => Boolean(e),
    );

    return errors;
  }
}
