import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";

export default class GuideGet extends BaseCommand<typeof GuideGet> {
  static summary = "Display a single guide from an environment.";

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
        value: guide.type,
      },
      {
        key: "Status",
        value: guide.active ? "Active" : "Inactive",
      },
      {
        key: "Description",
        value: guide.description || "-",
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

    // Leading space is there intentionally to align the left padding.
    if (guide.steps.length === 0) {
      return ux.log(" This guide has no steps to display.");
    }

    /*
     * Guide steps table
     */

    const steps = guide.steps.map((step, index) => ({ ...step, index }));

    ux.table(steps, {
      index: {
        header: "Steps",
        get: (step) => step.index + 1,
      },
      ref: {
        header: "Ref",
        minWidth: 18,
        get: (step) => step.ref,
      },
      schema_key: {
        header: "Schema",
        minWidth: 15,
        get: (step) => step.schema_key,
      },
      schema_variant_key: {
        header: "Variant",
        minWidth: 15,
        get: (step) => step.schema_variant_key,
      },
    });
  }
}
