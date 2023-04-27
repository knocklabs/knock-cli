import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand, { Props } from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { ApiError, formatErrors } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";
import * as Translation from "@/lib/marshal/translation";

export default class TranslationValidate extends BaseCommand {
  static flags = {
    environment: Flags.string({
      summary:
        "Validating a workflow is only done in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    all: Flags.boolean(),
    "translations-dir": CustomFlags.dirPath({ dependsOn: ["all"] }),
  };

  static args = [{ name: "translationRef", required: false }];

  async run(): Promise<void> {
    const target = await Translation.ensureValidCommandTarget(
      this.props,
      this.runContext,
    );
    const [translations, readErrors] =
      await Translation.readTranslationFilesForCommandTarget(target);

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors));
    }

    // XXX
    if (translations.length === 0) {
      this.error("No translation files found");
    }

    spinner.start(`‣ Validating`);

    const apiErrors = await TranslationValidate.validateAll(
      this.apiV1,
      this.props,
      translations,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors));
    }

    spinner.stop();
    // XXX
    this.log(`‣ Successfully validated ${translations.length} translation(s)`);
  }

  static async validateAll(
    api: ApiV1.T,
    props: Props,
    translations: Translation.TranslationFileData[],
  ): Promise<ApiError[]> {
    const errorPromises = translations.map(async (translation) => {
      const resp = await api.validateTranslation(props, {
        locale_code: translation.localeCode,
        namespace: translation.namespace,
        content: translation.content,
      });

      if (isSuccessResp(resp)) return;

      const message = formatErrorRespMessage(resp);
      return new ApiError(`${translation.abspath}: ` + message);
    });

    const errors = (await Promise.all(errorPromises)).filter(
      (e): e is Exclude<typeof e, undefined> => Boolean(e),
    );

    return errors;
  }
}
