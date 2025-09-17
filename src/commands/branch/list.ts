import { ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import { withSpinnerV2 } from "@/lib/helpers/request";

export default class BranchList extends BaseCommand<typeof BranchList> {
  static hidden = true;

  static summary =
    "Display all existing branches off of the development environment.";

  static enableJsonFlag = true;

  public async run(): Promise<ApiV1.ListBranchResp | void> {
    const resp = await withSpinnerV2<ApiV1.ListBranchResp>(() =>
      this.apiV1.knockMgmt.get("/v1/branches"),
    );

    const { flags } = this.props;
    if (flags.json) return resp;

    this.render(resp);
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
  }
}
