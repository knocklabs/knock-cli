import { Flags, ux } from "@oclif/core";
import { AxiosResponse } from "axios";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDate } from "@/lib/helpers/date";
import { merge } from "@/lib/helpers/object.isomorphic";
import {
  maybePromptPageAction,
  pageFlags,
  paramsForPageAction,
} from "@/lib/helpers/page";
import { withSpinner } from "@/lib/helpers/request";

export default class SourceList extends BaseCommand<typeof SourceList> {
  static summary = "Display all sources for an environment.";

  static flags = {
    environment: Flags.string({
      summary: "The environment to use.",
    }),
    ...pageFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.ListSourceResp | void> {
    const resp = await this.request();

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  async request(pageParams = {}): Promise<AxiosResponse<ApiV1.ListSourceResp>> {
    const props = merge(this.props, { flags: { ...pageParams } });

    return withSpinner<ApiV1.ListSourceResp>(() =>
      this.apiV1.listSources(props),
    );
  }

  async render(data: ApiV1.ListSourceResp): Promise<void> {
    const { entries } = data;

    const { environment } = this.props.flags;
    const scope = environment
      ? ` in ${formatCommandScope({ environment })}`
      : "";
    this.log(`‣ Showing ${entries.length} sources${scope}\n`);

    /*
     * Sources list table
     */

    ux.table(entries, {
      key: {
        header: "Key",
      },
      name: {
        header: "Name",
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

  async prompt(data: ApiV1.ListSourceResp): Promise<void> {
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
