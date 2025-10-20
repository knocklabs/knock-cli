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
import { formatCommitAuthor } from "@/lib/marshal/commit";

export default class CommitList extends BaseCommand<typeof CommitList> {
  static summary = "Display all commits in an environment";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    promoted: Flags.boolean({
      summary:
        "Show only promoted or unpromoted changes between the given environment and the subsequent environment.",
      allowNo: true,
    }),
    "resource-type": Flags.string({
      summary:
        "Filter commits by resource type. Can be used alone or together with resource-id. Use multiple --resource-type flags for multiple values.",
      multiple: true,
      options: [
        "email_layout",
        "guide",
        "message_type",
        "partial",
        "translation",
        "workflow",
      ],
    }),
    "resource-id": Flags.string({
      summary:
        "Filter commits by resource identifier. Must be used together with resource-type. For most resources, this will be the resource key. In the case of translations, this will be the locale code and namespace, separated by a /. For example, en/courses or en.",
    }),
    ...pageFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.ListCommitResp | void> {
    // Validate flag combinations
    const { flags } = this.props;
    const hasResourceType = Boolean(flags["resource-type"]?.length);
    const hasResourceTypes = Boolean(
      flags["resource-type"]?.length
        ? flags["resource-type"].length > 1
        : false,
    );
    const hasResourceId = Boolean(flags["resource-id"]);

    if (hasResourceId && !hasResourceType) {
      this.error(
        "The --resource-id flag must be used together with --resource-type. " +
          "You cannot use --resource-id without --resource-type.",
      );
    }

    if (hasResourceId && hasResourceTypes) {
      this.error(
        "The --resource-id flag cannot be used with multiple --resource-type. " +
          "Use --resource-id only with --resource-type for filtering by a specific resource.",
      );
    }

    const resp = await this.request();

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
    const { promoted } = this.props.flags;

    let qualifier = "";

    if (promoted === true) {
      qualifier = "(showing only promoted)";
    }

    if (promoted === false) {
      qualifier = "(showing only unpromoted)";
    }

    const scope = formatCommandScope(this.props.flags);
    this.log(`‣ Showing ${entries.length} commits in ${scope} ${qualifier}\n`);

    /*
     * Commits table
     */

    const formattedEntries = entries.map((entry) => ({
      id: entry.id,
      resource: entry.resource.type,
      identifier: entry.resource.identifier,
      author: formatCommitAuthor(entry),
      commit_message: entry.commit_message ? entry.commit_message.trim() : "",
      created_at: formatDate(entry.created_at),
    }));

    ux.table(formattedEntries, {
      id: {
        header: "ID",
      },
      resource: {
        header: "Resource",
      },
      identifier: {
        header: "Identifier",
      },
      author: {
        header: "Author",
      },
      commit_message: {
        header: "Commit message",
      },
      created_at: {
        header: "Created at",
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
