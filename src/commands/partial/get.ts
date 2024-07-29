import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";

export default class PartialGet extends BaseCommand<typeof PartialGet> {
  static summary = "Display a single partial from an environment.";

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
    partialKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetPartialResp | void> {
    spinner.start("‣ Loading");

    const { partial } = await this.loadPartial();

    spinner.stop();

    const { flags } = this.props;
    if (flags.json) return partial;

    this.render(partial);
  }

  private async loadPartial(): Promise<{
    partial: ApiV1.GetPartialResp;
  }> {
    const partialResp = await this.apiV1.getPartial(this.props);

    if (!isSuccessResp(partialResp)) {
      const message = formatErrorRespMessage(partialResp);
      ux.error(new ApiError(message));
    }

    return {
      partial: partialResp.data,
    };
  }

  render(partial: ApiV1.GetPartialResp): void {
    const { partialKey } = this.props.args;
    const { environment: env, "hide-uncommitted-changes": commitedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !commitedOnly ? "(including uncommitted)" : "";

    this.log(
      `‣ Showing partial \`${partialKey}\` in \`${env}\` environment ${qualifier}\n`,
    );

    /*
     * Partial table
     */

    const rows = [
      {
        key: "Name",
        value: partial.name,
      },
      {
        key: "Key",
        value: partial.key,
      },
      {
        key: "Type",
        value: partial.type,
      },
      {
        key: "Visual block",
        value: partial.visual_block_enabled ? "Enabled" : "Disabled",
      },
      {
        key: "Description",
        value: partial.description || "-",
      },
      {
        key: "Created at",
        value: formatDateTime(partial.created_at),
      },
      {
        key: "Updated at",
        value: formatDateTime(partial.updated_at),
      },
      {
        key: "Content",
        value: "",
      },
    ];

    ux.table(rows, {
      key: {
        header: "Partial",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 24,
      },
    });

    this.log("");
    ux.log(partial.content);
  }
}
