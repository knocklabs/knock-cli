import { ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
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

    return withSpinnerV2(() =>
      this.apiV1.mgmtClient.branches.list({
        environment: KnockEnv.Development,
        ...queryParams,
      }),
    ) as any as Promise<ApiV1.ListBranchResp>;
  }

  async render(data: ApiV1.ListBranchResp): Promise<void> {
    const { entries } = data;

    this.log(
      `‣ Showing ${entries.length} branches off of the development environment\n`,
    );

    const formattedBranches = entries.map((entry) => ({
      slug: entry.slug,
      created_at: formatDate(entry.created_at),
      updated_at: formatDate(entry.updated_at),
      last_commit_at: entry.last_commit_at
        ? formatDate(entry.last_commit_at)
        : "Never",
    }));

    ux.table(formattedBranches, {
      slug: { header: "Slug" },
      created_at: { header: "Created at" },
      updated_at: { header: "Updated at" },
      last_commit_at: { header: "Last commit at" },
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
