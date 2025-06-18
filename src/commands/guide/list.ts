import { Flags, ux } from "@oclif/core";
import { AxiosResponse } from "axios";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import { merge } from "@/lib/helpers/object.isomorphic";
import {
  maybePromptPageAction,
  pageFlags,
  paramsForPageAction,
} from "@/lib/helpers/page";
import { withSpinner } from "@/lib/helpers/request";
import { formatStatusWithSchedule } from "@/lib/marshal/guide/helpers";

export default class GuideList extends BaseCommand<typeof GuideList> {
  static summary = "Display all guides for an environment.";

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
    ...pageFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.ListGuideResp | void> {
    const resp = await this.request();

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  async request(pageParams = {}): Promise<AxiosResponse<ApiV1.ListGuideResp>> {
    const props = merge(this.props, { flags: { ...pageParams } });

    return withSpinner<ApiV1.ListGuideResp>(() => this.apiV1.listGuides(props));
  }

  async render(data: ApiV1.ListGuideResp): Promise<void> {
    const { entries } = data;
    const { environment: env, "hide-uncommitted-changes": committedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !committedOnly ? "(including uncommitted)" : "";

    this.log(
      `‣ Showing ${entries.length} guides in \`${env}\` environment ${qualifier}\n`,
    );

    /*
     * Guides list table
     */

    ux.table(entries, {
      key: {
        header: "Key",
      },
      name: {
        header: "Name",
      },
      type: {
        header: "Type",
        get: (entry) => entry.type || "-",
      },
      channel: {
        header: "Channel",
        get: (entry) => entry.channel_key || "-",
      },
      status: {
        header: "Status",
        get: (entry) => formatStatusWithSchedule(entry),
      },
      description: {
        header: "Description",
        get: (entry) => entry.description || "-",
      },
      updated_at: {
        header: "Updated at",
        get: (entry) => formatDate(entry.updated_at),
      },
    });

    return this.prompt(data);
  }

  async prompt(data: ApiV1.ListGuideResp): Promise<void> {
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
