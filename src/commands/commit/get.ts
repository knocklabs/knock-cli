import { Args, ux } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import { withSpinner } from "@/lib/helpers/request";
import { formatCommitAuthor } from "@/lib/marshal/commit";

export default class CommitGet extends BaseCommand<typeof CommitGet> {
  static summary = "Display a single commit based on an ID";

  static args = {
    id: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.GetCommitResp | void> {
    const { flags } = this.props;

    const resp = await withSpinner<ApiV1.GetCommitResp>(() =>
      this.apiV1.getCommit(this.props),
    );

    if (flags.json) return resp.data;
    this.render(resp.data);
  }

  render(commit: ApiV1.GetCommitResp): void {
    this.log(
      `‣ Showing commit \`${commit.id}\` in \`${commit.environment}\` environment`,
    );

    /*
     * Commit table
     */

    const rows = [
      {
        key: "ID",
        value: commit.id,
      },
      {
        key: "Resource",
        value: commit.resource.type,
      },
      {
        key: "Identifier",
        value: commit.resource.identifier,
      },
      {
        key: "Author",
        value: formatCommitAuthor(commit),
      },
      {
        key: "Created at",
        value: formatDate(commit.created_at),
      },
    ];

    this.log("");

    ux.table(rows, {
      key: {
        header: "Commit",
        minWidth: 18,
      },
      value: {
        header: "",
        minWidth: 16,
      },
    });

    this.log("");

    if (commit.commit_message) {
      ux.info(commit.commit_message)
      this.log("");
    }
  }
}
