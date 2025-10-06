import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";

export default class MessageTypeGet extends BaseCommand<typeof MessageTypeGet> {
  static summary = "Display a single in-app message type from an environment.";

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
    messageTypeKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetMessageTypeResp | void> {
    spinner.start("‣ Loading");

    const { messageType } = await this.loadMessageType();

    spinner.stop();

    const { flags } = this.props;
    if (flags.json) return messageType;

    this.render(messageType);
  }

  private async loadMessageType(): Promise<{
    messageType: ApiV1.GetMessageTypeResp;
  }> {
    const messageTypeResp = await this.apiV1.getMessageType(this.props);

    if (!isSuccessResp(messageTypeResp)) {
      const message = formatErrorRespMessage(messageTypeResp);
      ux.error(new ApiError(message));
    }

    return {
      messageType: messageTypeResp.data,
    };
  }

  render(messageType: ApiV1.GetMessageTypeResp): void {
    const { messageTypeKey } = this.props.args;
    const { environment: env, "hide-uncommitted-changes": commitedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !commitedOnly ? "(including uncommitted)" : "";

    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Showing in-app message type \`${messageTypeKey}\` in ${scope} ${qualifier}\n`,
    );

    /*
     * Message type table
     */

    const rows = [
      {
        key: "Name",
        value: messageType.name,
      },
      {
        key: "Key",
        value: messageType.key,
      },
      {
        key: "Description",
        value: messageType.description || "-",
      },
      {
        key: "Owner",
        value: messageType.owner,
      },
      {
        key: "Created at",
        value: formatDateTime(messageType.created_at),
      },
      {
        key: "Updated at",
        value: formatDateTime(messageType.updated_at),
      },
      {
        key: "Schema",
        value:
          (messageType.variants || []).length > 0
            ? "\n" + JSON.stringify(messageType.variants, null, 2)
            : "-",
      },
      {
        key: "Preview template",
        value: messageType.preview ? "\n" + messageType.preview : "-",
      },
    ];

    ux.table(rows, {
      key: {
        header: "Message type",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 24,
      },
    });
  }
}
