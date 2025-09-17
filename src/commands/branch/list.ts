import { ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import {
  maybePromptPageAction,
  pageFlags,
  PageParams,
  paramsForPageAction,
  toPageParams,
} from "@/lib/helpers/page";
import { withSpinnerV2 } from "@/lib/helpers/request";

export default class BranchList extends BaseCommand<typeof BranchList> {
  static hidden = true;

  static summary =
    "Display all existing branches off of the development environment.";

  static flags = {
    ...pageFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.ListBranchResp | void> {
    const resp = await this.request();

    const { flags } = this.props;
    if (flags.json) return resp;

    this.render(resp);
  }

  async request(pageParams: PageParams = {}): Promise<ApiV1.ListBranchResp> {
    const queryParams = toPageParams({
      ...this.props.flags,
      ...pageParams,
    });

    return withSpinnerV2<ApiV1.ListBranchResp>(() =>
      this.apiV1.knockMgmt.get("/v1/branches", { query: queryParams }),
    );
  }

  async render(data: ApiV1.ListBranchResp): Promise<void> {
    const { entries } = data;

    this.log(
      `‣ Showing ${entries.length} branches off of the development environment\n`,
    );

    ux.table(entries, {
      slug: {
        header: "Slug",
      },
      created_at: {
        header: "Created at",
        get: (entry) => formatDate(entry.created_at),
      },
      updated_at: {
        header: "Updated at",
        get: (entry) => formatDate(entry.updated_at),
      },
      last_commit_at: {
        header: "Last commit at",
        get: (entry) =>
          entry.last_commit_at ? formatDate(entry.last_commit_at) : "Never",
      },
    });

    return this.prompt(data);
  }

  async prompt(data: ApiV1.ListBranchResp): Promise<void> {
    const { page_info } = data;

    const pageAction = await maybePromptPageAction(page_info);
    const pageParams = pageAction && paramsForPageAction(pageAction, page_info);

    if (pageParams) {
      this.log("\n");

      const resp = await this.request(pageParams);
      return this.render(resp);
    }
  }
}
