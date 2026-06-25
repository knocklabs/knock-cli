import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";
import { SourceEnvironmentSettings } from "@/lib/marshal/source";
import {
  formatMappingStatus,
  formatPreprocessScript,
  formatSettingValue,
  SOURCE_SETTINGS_DISPLAY,
} from "@/lib/marshal/source/helpers";

export default class SourceGet extends BaseCommand<typeof SourceGet> {
  static summary = "Display a single source from an environment.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
  };

  static args = {
    sourceKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetSourceResp | void> {
    spinner.start("‣ Loading");

    const { source } = await this.loadSource();

    spinner.stop();

    const { flags } = this.props;
    if (flags.json) return source;

    this.render(source);
  }

  private async loadSource(): Promise<{
    source: ApiV1.GetSourceResp;
  }> {
    const sourceResp = await this.apiV1.getSource(this.props);

    if (!isSuccessResp(sourceResp)) {
      const message = formatErrorRespMessage(sourceResp);
      ux.error(new ApiError(message));
    }

    return {
      source: sourceResp.data,
    };
  }

  render(source: ApiV1.GetSourceResp): void {
    const { sourceKey } = this.props.args;

    const scope = formatCommandScope(this.props.flags);
    this.log(`‣ Showing source \`${sourceKey}\` in ${scope}\n`);

    /*
     * Source table
     */

    const rows = [
      {
        key: "Name",
        value: source.name,
      },
      {
        key: "Key",
        value: source.key,
      },
      {
        key: "Description",
        value: source.description || "-",
      },
      {
        key: "Custom image URL",
        value: source.custom_image_url || "-",
      },
      {
        key: "Created at",
        value: formatDateTime(source.created_at),
      },
      {
        key: "Updated at",
        value: formatDateTime(source.updated_at),
      },
    ];

    ux.table(rows, {
      key: {
        header: "Source",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 24,
      },
    });

    this.log("");

    /*
     * Per-environment settings
     */

    const envSettings = source.environment_settings ?? {};

    for (const slug of Object.keys(envSettings)) {
      this.renderEnvironmentSettings(slug, envSettings[slug]);
    }
  }

  private renderEnvironmentSettings(
    slug: string,
    envSettings: SourceEnvironmentSettings,
  ): void {
    const { settings, mappings } = envSettings;

    this.log(`Environment: \`${slug}\`\n`);

    const settingsRows = [
      ...SOURCE_SETTINGS_DISPLAY.map(({ key, label }) => ({
        key: label,
        value: formatSettingValue(settings[key]),
      })),
      {
        key: "Preprocess script",
        value: formatPreprocessScript(settings),
      },
    ];

    ux.table(settingsRows, {
      key: {
        header: "Settings",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 24,
      },
    });

    this.log("");

    if (mappings.length > 0) {
      ux.table(mappings, {
        event_type: {
          header: "Event type",
        },
        action_type: {
          header: "Action type",
        },
        status: {
          header: "Status",
          get: (mapping) => formatMappingStatus(mapping),
        },
      });

      this.log("");
    }
  }
}
