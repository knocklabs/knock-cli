import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";
import { formatConditions } from "@/lib/marshal/conditions";
import {
  formatActivationRules,
  formatStatusWithSchedule,
  formatStep,
} from "@/lib/marshal/guide/helpers";

export default class GuideGet extends BaseCommand<typeof GuideGet> {
  static summary = "Display a single guide from an environment.";

  // Hide until guides are released in GA.
  static hidden = true;

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
  };

  static args = {
    guideKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetGuideResp | void> {
    spinner.start("‣ Loading");

    const { guide } = await this.loadGuide();

    spinner.stop();

    const { flags } = this.props;
    if (flags.json) return guide;

    this.render(guide);
  }

  private async loadGuide(): Promise<{
    guide: ApiV1.GetGuideResp;
  }> {
    const guideResp = await this.apiV1.getGuide(this.props);

    if (!isSuccessResp(guideResp)) {
      const message = formatErrorRespMessage(guideResp);
      ux.error(new ApiError(message));
    }

    return {
      guide: guideResp.data,
    };
  }

  render(guide: ApiV1.GetGuideResp): void {
    const { guideKey } = this.props.args;
    const { environment: env, "hide-uncommitted-changes": committedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !committedOnly ? "(including uncommitted)" : "";

    this.log(
      `‣ Showing guide \`${guideKey}\` in \`${env}\` environment ${qualifier}\n`,
    );

    /*
     * Guide table
     */

    const rows = [
      {
        key: "Name",
        value: guide.name,
      },
      {
        key: "Key",
        value: guide.key,
      },
      {
        key: "Type",
        value: guide.type || "-",
      },
      {
        key: "Status",
        value: formatStatusWithSchedule(guide),
      },
      {
        key: "Description",
        value: guide.description || "-",
      },
      {
        key: "Content",
        value: guide.steps.length > 0 ? formatStep(guide.steps[0]) : "-",
      },
      {
        key: "Targeting audience",
        value: guide.target_audience_key || "(All users)",
      },
      {
        key: "Targeting conditions",
        value: guide.target_property_conditions
          ? formatConditions(guide.target_property_conditions)
          : "-",
      },
      {
        key: "Activation",
        value: formatActivationRules(guide.activation_location_rules),
      },
      {
        key: "Created at",
        value: formatDateTime(guide.created_at),
      },
      {
        key: "Updated at",
        value: formatDateTime(guide.updated_at),
      },
    ];

    ux.table(rows, {
      key: {
        header: "Guide",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 24,
      },
    });

    this.log("");
  }
}
