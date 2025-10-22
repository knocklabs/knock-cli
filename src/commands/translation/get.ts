import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDate } from "@/lib/helpers/date";
import * as CustomFlags from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import * as Translation from "@/lib/marshal/translation";

export default class TranslationGet extends BaseCommand<typeof TranslationGet> {
  static summary = "Display a single translation from an environment.";

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
    format: Flags.option({
      summary: "Specify the output format of the returned translations.",
      options: ["json", "po"] as const,
      default: "json",
    })(),
  };

  static args = {
    translationRef: Args.string({
      description: Translation.translationRefDescription,
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetTranslationResp | void> {
    const { args, flags } = this.props;

    const parsedRef = Translation.parseTranslationRef(args.translationRef);
    if (!parsedRef) {
      return this.error(
        `Invalid translation ref \`${args.translationRef}\`, use valid <locale> or <namespace>.<locale> for namespaced translations`,
      );
    }

    const resp = await withSpinner<ApiV1.GetTranslationResp>(() =>
      this.apiV1.getTranslation(this.props, parsedRef),
    );

    if (flags.json) return resp.data;
    this.render(resp.data);
  }

  render(translation: ApiV1.GetTranslationResp): void {
    const { translationRef } = this.props.args;
    const {
      environment: env,
      "hide-uncommitted-changes": commitedOnly,
      format,
    } = this.props.flags;

    const qualifier =
      env === "development" && !commitedOnly ? "(including uncommitted)" : "";

    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Showing translation \`${translationRef}\` in ${scope} ${qualifier}\n`,
    );

    /*
     * Translation table
     */

    const rows = [
      {
        key: "Language",
        value: Translation.formatLanguage(translation),
      },
      {
        key: "Locale",
        value: translation.locale_code,
      },
      {
        key: "Namespace",
        value: translation.namespace || "-",
      },
      {
        key: "Updated at",
        value: formatDate(translation.updated_at),
      },
      {
        key: "Created at",
        value: formatDate(translation.created_at),
      },
    ];

    ux.table(rows, {
      key: {
        header: "Translation",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 16,
      },
    });

    this.log("");
    if (format === "json") {
      ux.styledJSON(JSON.parse(translation.content));
    } else {
      ux.log(translation.content);
    }
  }
}
