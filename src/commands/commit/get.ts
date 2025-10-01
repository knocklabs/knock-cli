import { Commit } from "@knocklabs/mgmt/resources/commits";
import { Args, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import { withSpinnerV2 } from "@/lib/helpers/request";
import { formatCommitAuthor } from "@/lib/marshal/commit";

export default class CommitGet extends BaseCommand<typeof CommitGet> {
  static summary = "Display a single commit";

  static args = {
    id: Args.string({
      required: true,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<Commit | void> {
    const { flags, args } = this.props;

    const resp = await withSpinnerV2(() =>
      this.apiV1.mgmtClient.commits.retrieve(args.id),
    );

    if (flags.json) return resp;
    this.render(resp);
  }

  render(commit: Commit): void {
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
      this.log(commit.commit_message);
      this.log("");
    }
  }
}
