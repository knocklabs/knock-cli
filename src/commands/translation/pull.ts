import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { DirContext } from "@/lib/helpers/fs";
import { merge } from "@/lib/helpers/object";
import { MAX_PAGINATION_LIMIT, PageInfo } from "@/lib/helpers/page";
import {
  formatErrorRespMessage,
  isSuccessResp,
  withSpinner,
} from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Translation from "@/lib/marshal/translation";
import { TranslationDirContext } from "@/lib/run-context";

export default class TranslationPull extends BaseCommand {
  static flags = {
    environment: Flags.string({ default: "development" }),
    all: Flags.boolean(),
    "translations-dir": CustomFlags.dirPath({ dependsOn: ["all"] }),
    "hide-uncommitted-changes": Flags.boolean(),
    force: Flags.boolean(),
  };

  static args = [{ name: "translationRef", required: false }];

  async run(): Promise<void> {
    const target = await Translation.ensureValidCommandTarget(
      this.props,
      this.runContext,
    );

    switch (target.type) {
      case "translationFile":
        this.pullOneTranslation(target.context);
        return;

      case "translationDir":
        this.pullAllTranslationsForLocale(target.context);
        return;

      case "translationsIndexDir":
        this.pullAllTranslations(target.context);
        return;

      default:
        throw new Error(`Invalid translation command target: ${target}`);
    }
  }

  /*
   * Pull a single translation (using TranslationFileContext)
   */
  async pullOneTranslation(
    targetCtx: Translation.TranslationFileContext,
  ): Promise<void> {
    const { flags } = this.props;

    if (targetCtx.exists) {
      this.log(
        `‣ Found the translation \`${targetCtx.ref}\` at ${targetCtx.abspath}`,
      );
    } else {
      const prompt = `Create a new translation file \`${targetCtx.ref}\` at ${targetCtx.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    }

    const resp = await withSpinner<ApiV1.GetTranslationResp>(() =>
      this.apiV1.getTranslation(this.props, targetCtx),
    );

    await Translation.writeTranslationFile(targetCtx, resp.data);

    const actioned = targetCtx.exists ? "updated" : "created";
    this.log(
      `‣ Successfully ${actioned} \`${targetCtx.ref}\` at ${targetCtx.abspath}`,
    );
  }

  /*
   * Pull all translations for a locale (using TranslationDirContext)
   */
  async pullAllTranslationsForLocale(
    targetCtx: TranslationDirContext,
  ): Promise<void> {
    const { flags } = this.props;

    const prompt = targetCtx.exists
      ? `Pull latest \`${targetCtx.key}\` translations into ${targetCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new \`${targetCtx.key}\` translations directory at ${targetCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    // Fetch all translations for a given locale then write them to the local
    // file system.
    spinner.start(`‣ Loading`);

    const filters = { localeCode: targetCtx.key };
    const translations = await this.listAllTranslations(filters);
    await Translation.writeTranslationFiles(targetCtx, translations);
    spinner.stop();

    const actioned = targetCtx.exists ? "updated" : "created";
    this.log(
      `‣ Successfully ${actioned} the \`${targetCtx.key}\` translations directory at ${targetCtx.abspath}`,
    );
  }

  /*
   * Pull all translations (using DirContext)
   */
  async pullAllTranslations(targetCtx: DirContext): Promise<void> {
    const { flags } = this.props;

    const prompt = targetCtx.exists
      ? `Pull latest translations into ${targetCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new translations directory at ${targetCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    // Fetch all translations then write them to the local file system.
    spinner.start(`‣ Loading`);

    const translations = await this.listAllTranslations();
    await Translation.writeTranslationFiles(targetCtx, translations);
    spinner.stop();

    const action = targetCtx.exists ? "updated" : "created";
    this.log(
      `‣ Successfully ${action} the translations directory at ${targetCtx.abspath}`,
    );
  }

  async listAllTranslations(
    filters: Partial<Translation.TranslationIdentifier> = {},
    pageParams: Partial<PageInfo> = {},
    translationsFetchedSoFar: Translation.TranslationData[] = [],
  ): Promise<Translation.TranslationData[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        limit: MAX_PAGINATION_LIMIT,
      },
    });

    const resp = await this.apiV1.listTranslations(props, filters);
    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const translations = [...translationsFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllTranslations(
          filters,
          { after: pageInfo.after },
          translations,
        )
      : translations;
  }
}
