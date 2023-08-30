import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatError, formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";
import * as Translation from "@/lib/marshal/translation";

import TranslationValidate from "./validate";

export default class TranslationPush extends BaseCommand<
  typeof TranslationPush
> {
  static summary =
    "Push one or more translations from a local file system to Knock.";

  static flags = {
    environment: Flags.string({
      summary:
        "Pushing a translation is only allowed in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    all: Flags.boolean({
      summary: "Whether to push all translations from the target directory.",
    }),
    "translations-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all translations to push.",
      dependsOn: ["all"],
    }),
    commit: Flags.boolean({
      summary: "Push and commit the translation(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
  };

  static args = {
    translationRef: Args.string({
      description: Translation.translationRefDescription,
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // 1. First read all translation files found for the given command.
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

    // 2. Then validate them all ahead of pushing them.
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

    // 3. Finally push up each translation file, abort on the first error.
    // When it's pushed, Control will check for whether the translation's content
    // has changed for the most recent version. If it hasn't, it won't make a commit.
    // We'll gather the translations that had changes and did not have changes to surface a helpful
    // message back to the user.

    spinner.start(`‣ Pushing`);

    const upsertedTranslations = [];
    const unchangedTranslations = [];

    for (const translation of translations) {
      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertTranslation(this.props, {
        locale_code: translation.localeCode,
        namespace: translation.namespace,
        content: translation.content,
      });

      if (isSuccessResp(resp)) {
        resp.data.had_changes
          ? upsertedTranslations.push(
              resp.data.translation as Translation.TranslationData,
            )
          : unchangedTranslations.push(
              resp.data.translation as Translation.TranslationData,
            );
        continue;
      }

      const message = formatErrorRespMessage(resp);
      const error = new SourceError(message, translation.abspath, "ApiError");
      this.error(formatError(error));
    }

    spinner.stop();

    // 4. Display a success message.
    const actioned = flags.commit ? "pushed and committed" : "pushed";
    const { unchangedMessage, upsertedMessage } = generateSuccessLog(
      upsertedTranslations,
      unchangedTranslations,
      actioned,
    );

    if (upsertedTranslations.length > 0) {
      this.log(upsertedMessage);
    }

    if (unchangedTranslations.length > 0) {
      this.log(unchangedMessage);
    }
  }
}

const generateSuccessLog = (
  upsertedTranslations: Translation.TranslationData[],
  unchangedTranslations: Translation.TranslationData[],
  actioned: string,
) => {
  const upsertedCount = upsertedTranslations.length;
  const upsertedRefs = upsertedTranslations.map((t) =>
    generateTranslationRef(t),
  );

  const unchangedCount = unchangedTranslations.length;
  const unchangedRefs = unchangedTranslations.map((t) =>
    generateTranslationRef(t),
  );

  const upsertedMessage =
    `‣ Successfully ${actioned} ${upsertedCount} translation(s):\n` +
    indentString(upsertedRefs.join("\n"), 4);

  const unchangedMessage =
    `‣ No changes detected for ${unchangedCount} translation(s):\n` +
    indentString(unchangedRefs.join("\n"), 4);

  return { unchangedMessage, upsertedMessage };
};

const generateTranslationRef = (translation: Translation.TranslationData) => {
  const namespace = translation?.namespace ? `${translation?.namespace}.` : "";
  return `${namespace}${translation?.locale_code}`;
};
