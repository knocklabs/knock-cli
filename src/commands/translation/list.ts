import { Flags, ux } from "@oclif/core";
import { AxiosResponse } from "axios";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDate } from "@/lib/helpers/date";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import {
  maybePromptPageAction,
  pageFlags,
  paramsForPageAction,
} from "@/lib/helpers/page";
import { withSpinner } from "@/lib/helpers/request";
import * as Translation from "@/lib/marshal/translation";

export default class TranslationList extends BaseCommand<
  typeof TranslationList
> {
  static summary = "Display all translations for an environment.";

  static verifyFeatureEnabled = "translations" as const;

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
    ...pageFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.ListTranslationResp | void> {
    const resp = await this.request();

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  async request(
    pageParams = {},
  ): Promise<AxiosResponse<ApiV1.ListTranslationResp>> {
    const props = merge(this.props, { flags: { ...pageParams } });

    return withSpinner<ApiV1.ListTranslationResp>(() =>
      this.apiV1.listTranslations(props),
    );
  }

  async render(data: ApiV1.ListTranslationResp): Promise<void> {
    const { entries } = data;
    const { environment: env, "hide-uncommitted-changes": committedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !committedOnly ? "(including uncommitted)" : "";

    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Showing ${entries.length} translations in ${scope} ${qualifier}\n`,
    );

    /*
     * Translations list table
     */

    ux.table(entries, {
      ref: {
        header: "Ref",
        get: (entry) =>
          Translation.formatRef(entry.locale_code, entry.namespace),
      },
      language_name: {
        header: "Language",
        get: (entry) => Translation.formatLanguage(entry),
      },
      locale_code: {
        header: "Locale",
      },
      namespace: {
        header: "Namespace",
      },
      updated_at: {
        header: "Updated at",
        get: (entry) => formatDate(entry.updated_at),
      },
      created_at: {
        header: "Created at",
        get: (entry) => formatDate(entry.created_at),
      },
    });

    return this.prompt(data);
  }

  async prompt(data: ApiV1.ListTranslationResp): Promise<void> {
    const { page_info } = data;

    const pageAction = await maybePromptPageAction(page_info);
    const pageParams = pageAction && paramsForPageAction(pageAction, page_info);

    if (pageParams) {
      this.log("\n");

      const resp = await this.request(pageParams);
      return this.render(resp.data);
    }
  }
}
