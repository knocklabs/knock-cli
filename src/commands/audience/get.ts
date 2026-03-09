import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";

export default class AudienceGet extends BaseCommand<typeof AudienceGet> {
  static summary = "Display a single audience from an environment.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
  };

  static args = {
    audienceKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetAudienceResp | void> {
    spinner.start("‣ Loading");

    const { audience } = await this.loadAudience();

    spinner.stop();

    const { flags } = this.props;
    if (flags.json) return audience;

    this.render(audience);
  }

  private async loadAudience(): Promise<{
    audience: ApiV1.GetAudienceResp;
  }> {
    const audienceResp = await this.apiV1.getAudience(this.props);

    if (!isSuccessResp(audienceResp)) {
      const message = formatErrorRespMessage(audienceResp);
      ux.error(new ApiError(message));
    }

    return {
      audience: audienceResp.data,
    };
  }

  render(audience: ApiV1.GetAudienceResp): void {
    const { audienceKey } = this.props.args;
    const { environment: env, "hide-uncommitted-changes": committedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !committedOnly ? "(including uncommitted)" : "";

    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Showing audience \`${audienceKey}\` in ${scope} ${qualifier}\n`,
    );

    /*
     * Audience table
     */

    const rows = [
      {
        key: "Name",
        value: audience.name,
      },
      {
        key: "Key",
        value: audience.key,
      },
      {
        key: "Type",
        value: audience.type,
      },
      {
        key: "Description",
        value: audience.description || "-",
      },
      {
        key: "Created at",
        value: formatDateTime(audience.created_at),
      },
      {
        key: "Updated at",
        value: formatDateTime(audience.updated_at),
      },
    ];

    ux.table(rows, {
      key: {
        header: "Audience",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 24,
      },
    });

    // Show segments for dynamic audiences
    if (audience.type === "dynamic" && audience.segments) {
      this.log("\nSegments:");
      this.log(JSON.stringify(audience.segments, null, 2));
    }
  }
}
