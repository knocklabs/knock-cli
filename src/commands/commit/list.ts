import { Flags, ux } from "@oclif/core";
import { AxiosResponse } from "axios";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import { merge } from "@/lib/helpers/object";
import {
  maybePromptPageAction,
  pageFlags,
  paramsForPageAction,
} from "@/lib/helpers/page";
import { withSpinner } from "@/lib/helpers/request";
import { formatCommitAuthor } from "@/lib/marshal/commit";

export default class CommitList extends BaseCommand<typeof CommitList> {
  static summary = "Display all commits in an environment";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    promoted: Flags.boolean({
      summary: "Show only promoted or unpromoted changes between the given environment and the subsequent environment.",
      allowNo: true,
    }),
    ...pageFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.ListCommitResp | void> {
    const resp = await this.request();

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  async request(pageParams = {}): Promise<AxiosResponse<ApiV1.ListCommitResp>> {
    const props = merge(this.props, { flags: { ...pageParams } });

    return withSpinner<ApiV1.ListCommitResp>(() =>
      this.apiV1.listCommits(props),
    );
  }

  async render(data: ApiV1.ListCommitResp): Promise<void> {
    const { entries } = data;
    const { environment: env, promoted } = this.props.flags;

    let qualifier = "";

    if (env === "development" && promoted) {
      qualifier = "(showing promoted)";
    }

    if (env === "development" && promoted === false) {
      qualifier = "(showing unpromoted)";
    }

    this.log(
      `‣ Showing ${entries.length} commits in \`${env}\` environment ${qualifier}\n`,
    );

    /*
     * Commits table
     */

    ux.table(entries, {
      id: {
        header: "ID",
      },
      resource: {
        header: "Resource",
        get: (entry) => entry.resource.type,
      },
      identifier: {
        header: "Identifier",
        get: (entry) => entry.resource.identifier,
      },
      author: {
        header: "Author",
        get: (entry) => formatCommitAuthor(entry),
      },
      commit_message: {
        header: "Commit message",
      },
      created_at: {
        header: "Created at",
        get: (entry) => formatDate(entry.created_at),
      },
    });

    return this.prompt(data);
  }

  async prompt(data: ApiV1.ListCommitResp): Promise<void> {
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
