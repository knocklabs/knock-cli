import { Args, Flags, ux } from "@oclif/core";
import { AxiosResponse } from "axios";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDateTime } from "@/lib/helpers/date";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import {
  maybePromptPageAction,
  pageFlags,
  paramsForPageAction,
} from "@/lib/helpers/page";
import { withSpinner } from "@/lib/helpers/request";

export default class SourceLogs extends BaseCommand<typeof SourceLogs> {
  static summary = "Display logs for a source in an environment.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    event: Flags.string({
      summary: "Filter logs by event type.",
    }),
    id: Flags.string({
      summary: "Filter logs by a specific source log id.",
    }),
    date: Flags.string({
      summary: "Filter logs to a single calendar day (e.g. 2024-01-15).",
    }),
    "starting-at": CustomFlags.dateTime({
      summary: "Only show logs at or after this ISO-8601 date-time.",
    }),
    "ending-at": CustomFlags.dateTime({
      summary: "Only show logs at or before this ISO-8601 date-time.",
    }),
    ...pageFlags,
  };

  static args = {
    sourceKey: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.ListSourceLogsResp | void> {
    const resp = await this.request();

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  async request(
    pageParams = {},
  ): Promise<AxiosResponse<ApiV1.ListSourceLogsResp>> {
    const props = merge(this.props, { flags: { ...pageParams } });

    return withSpinner<ApiV1.ListSourceLogsResp>(() =>
      this.apiV1.listSourceLogs(props),
    );
  }

  async render(data: ApiV1.ListSourceLogsResp): Promise<void> {
    const { entries } = data;
    const { sourceKey } = this.props.args;

    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Showing ${entries.length} logs for source \`${sourceKey}\` in ${scope}\n`,
    );

    /*
     * Source logs table
     */

    ux.table(entries, {
      id: {
        header: "ID",
      },
      event: {
        header: "Event",
        get: (entry) => entry.event || "-",
      },
      verification_status: {
        header: "Verification",
        get: (entry) => entry.verification_status || "-",
      },
      inserted_at: {
        header: "Received at",
        get: (entry) =>
          entry.inserted_at ? formatDateTime(entry.inserted_at) : "-",
      },
    });

    return this.prompt(data);
  }

  async prompt(data: ApiV1.ListSourceLogsResp): Promise<void> {
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
