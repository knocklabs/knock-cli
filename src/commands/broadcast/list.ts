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
import * as Broadcast from "@/lib/marshal/broadcast";

export default class BroadcastList extends BaseCommand<typeof BroadcastList> {
  static summary = "Display all broadcasts for an environment.";

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

  async run(): Promise<ApiV1.ListBroadcastResp | void> {
    const resp = await this.request();

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  async request(
    pageParams = {},
  ): Promise<AxiosResponse<ApiV1.ListBroadcastResp>> {
    const props = merge(this.props, { flags: { ...pageParams } });

    return withSpinner<ApiV1.ListBroadcastResp>(() =>
      this.apiV1.listBroadcasts(props),
    );
  }

  async render(data: ApiV1.ListBroadcastResp): Promise<void> {
    const { entries } = data;
    const { environment: env, "hide-uncommitted-changes": commitedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !commitedOnly ? "(including uncommitted)" : "";

    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Showing ${entries.length} broadcasts in ${scope} ${qualifier}\n`,
    );

    ux.table(entries, {
      key: {
        header: "Key",
      },
      name: {
        header: "Name",
      },
      status: {
        header: "Status",
        get: (entry) => Broadcast.formatStatus(entry),
      },
      categories: {
        header: "Categories",
        get: (entry) => Broadcast.formatCategories(entry, { truncateAfter: 3 }),
      },
      target_audience_key: {
        header: "Target audience",
        get: (entry) => entry.target_audience_key || "-",
      },
      updated_at: {
        header: "Updated at",
        get: (entry) => formatDate(entry.updated_at),
      },
    });

    return this.prompt(data);
  }

  async prompt(data: ApiV1.ListBroadcastResp): Promise<void> {
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
