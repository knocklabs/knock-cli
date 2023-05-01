import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object";
import { MAX_PAGINATION_LIMIT, PageInfo } from "@/lib/helpers/page";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Translation from "@/lib/marshal/translation";

export default class TranslationPull extends BaseCommand {
  static flags = {
    environment: Flags.string({ default: "development" }),
    all: Flags.boolean(),
    "translations-dir": CustomFlags.dirPath({ dependsOn: ["all"] }),
    "hide-uncommitted-changes": Flags.boolean(),
    force: Flags.boolean(),
  };

  async run(): Promise<void> {
    const { flags } = this.props;
    // TODO MKD: Enable pulling a single translation or group of translations for locale
    return flags.all
      ? this.pullAllTranslations()
      : this.error("Must use --all to pull all translations");
  }

  /*
   * Pull all translations
   */

  async pullAllTranslations(): Promise<void> {
    const { flags } = this.props;

    // TODO: In the future we should default to the knock project config first
    // if present, before defaulting to the cwd.
    const defaultToCwd = { abspath: this.runContext.cwd, exists: true };
    const targetDirCtx = flags["translations-dir"] || defaultToCwd;

    const prompt = targetDirCtx.exists
      ? `Pull latest translations into ${targetDirCtx.abspath}? This will overwrite the contents of this directory.`
      : `Create a new translations directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    // Fetch all translations then write them to the local file system.
    spinner.start(`‣ Loading`);

    const translations = await this.listAllTranslations();
    await Translation.writeTranslationsIndexDir(targetDirCtx, translations);
    spinner.stop();

    const action = targetDirCtx.exists ? "updated" : "created";
    this.log(
      `‣ Successfully ${action} the translations directory at ${targetDirCtx.abspath}`,
    );
  }

  async listAllTranslations(
    pageParams: Partial<PageInfo> = {},
    translationsFetchedSoFar: Translation.TranslationData[] = [],
  ): Promise<Translation.TranslationData[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        limit: MAX_PAGINATION_LIMIT,
      },
    });

    const resp = await this.apiV1.listTranslations(props);
    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const translations = [...translationsFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllTranslations({ after: pageInfo.after }, translations)
      : translations;
  }
}
