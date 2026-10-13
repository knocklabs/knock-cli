import { Args, Flags, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";

export default class ReusableRequestGet extends BaseCommand<
  typeof ReusableRequestGet
> {
  static summary = "Display a single reusable request from an environment.";

  static flags = {
    environment: CustomFlags.environment,
    branch: CustomFlags.branch,
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
  };

  static args = {
    reusableRequestKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetReusableRequestResp | void> {
    spinner.start("‣ Loading");

    const reusableRequest = await this.loadReusableRequest();

    spinner.stop();

    const { flags } = this.props;
    if (flags.json) return reusableRequest;

    this.render(reusableRequest);
  }

  private async loadReusableRequest(): Promise<ApiV1.GetReusableRequestResp> {
    const resp = await this.apiV1.getReusableRequest(this.props);

    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      ux.error(new ApiError(message));
    }

    return resp.data;
  }

  render(reusableRequest: ApiV1.GetReusableRequestResp): void {
    const { reusableRequestKey } = this.props.args;
    const { environment: env, "hide-uncommitted-changes": committedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !committedOnly ? "(including uncommitted)" : "";

    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Showing reusable request \`${reusableRequestKey}\` in ${scope} ${qualifier}\n`,
    );

    const rows = [
      {
        key: "Name",
        value: reusableRequest.name || "-",
      },
      {
        key: "Key",
        value: reusableRequest.key,
      },
      {
        key: "Type",
        value: reusableRequest.type,
      },
      {
        key: "Description",
        value: reusableRequest.description || "-",
      },
      {
        key: "Method",
        value: reusableRequest.settings?.method || "-",
      },
      {
        key: "URL",
        value: reusableRequest.settings?.url || "-",
      },
      {
        key: "Created at",
        value: formatDateTime(reusableRequest.created_at),
      },
      {
        key: "Updated at",
        value: formatDateTime(reusableRequest.updated_at),
      },
    ];

    ux.table(rows, {
      key: {
        header: "Reusable request",
        minWidth: 24,
      },
      value: {
        header: "",
        minWidth: 24,
      },
    });
  }
}
