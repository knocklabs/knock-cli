import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { ApiError, formatErrors } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";
import * as Translation from "@/lib/marshal/translation";

import TranslationValidate from "./validate";

export default class TranslationPush extends BaseCommand {
  static flags = {
    environment: Flags.string({
      summary:
        "Pushing a translation is only allowed in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    all: Flags.boolean(),
    "translations-dir": CustomFlags.dirPath({ dependsOn: ["all"] }),
    commit: Flags.boolean({
      summary: "Push and commit the translation(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
  };

  static args = [{ name: "translationRef", required: false }];

  async run(): Promise<ApiV1.UpsertTranslationResp | void> {
    // First read all translation files found for the given command.
    const target = await Translation.ensureValidCommandTarget(
      this.props,
      this.runContext,
    );
    const [translations, readErrors] =
      await Translation.readTranslationFilesForCommandTarget(target);

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors));
    }

    if (translations.length === 0) {
      this.error("No translation files found");
    }

    // Then validate them all ahead of pushing them.
    spinner.start(`‣ Validating`);

    const apiErrors = await TranslationValidate.validateAll(
      this.apiV1,
      this.props,
      translations,
    );

    if (apiErrors.length > 0) {
      this.error(formatErrors(apiErrors));
    }

    // Finally push up each translation file, abort on the first error.
    for (const translation of translations) {
      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertTranslation(this.props, {
        locale_code: translation.localeCode,
        namespace: translation.namespace,
        content: translation.content,
      });

      if (isSuccessResp(resp)) continue;

      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(`${translation.abspath}: ` + message));
    }

    spinner.stop();
    this.log(`‣ Successfully pushed ${translations.length} translation(s)`);
  }
}
