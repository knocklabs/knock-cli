import { Audience } from "@knocklabs/mgmt/resources/audiences";
import { Flags, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatDate } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import {
  maybePromptPageAction,
  pageFlags,
  PageInfo,
  paramsForPageAction,
} from "@/lib/helpers/page";
import { spinner } from "@/lib/helpers/ux";

type ListAudienceData = {
  entries: Audience[];
  page_info: PageInfo;
};

export default class AudienceList extends BaseCommand<typeof AudienceList> {
  static summary = "Display all audiences for an environment.";

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

  async run(): Promise<ListAudienceData | void> {
    const data = await this.request();

    const { flags } = this.props;
    if (flags.json) return data;

    return this.render(data);
  }

  async request(
    pageParams: { after?: string; before?: string } = {},
  ): Promise<ListAudienceData> {
    const { flags } = this.props;

    spinner.start("‣ Loading");

    try {
      const page = await this.apiV1.mgmtClient.audiences.list({
        environment: flags.environment,
        branch: flags.branch,
        hide_uncommitted_changes: flags["hide-uncommitted-changes"],
        limit: flags.limit,
        after: pageParams.after ?? flags.after,
        before: pageParams.before ?? flags.before,
      });

      spinner.stop();

      return {
        entries: page.entries,
        page_info: page.page_info,
      };
    } catch (error) {
      spinner.stop();
      throw new ApiError((error as Error).message);
    }
  }

  async render(data: ListAudienceData): Promise<void> {
    const { entries } = data;
    const { environment: env, "hide-uncommitted-changes": committedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !committedOnly ? "(including uncommitted)" : "";

    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Showing ${entries.length} audiences in ${scope} ${qualifier}\n`,
    );

    /*
     * Audiences list table
     */

    ux.table(entries as unknown as Record<string, unknown>[], {
      key: {
        header: "Key",
      },
      name: {
        header: "Name",
      },
      description: {
        header: "Description",
      },
      type: {
        header: "Type",
      },
      updated_at: {
        header: "Updated at",
        get: (entry) => formatDate(entry.updated_at as string),
      },
    });

    return this.prompt(data);
  }

  async prompt(data: ListAudienceData): Promise<void> {
    const { page_info } = data;

    const pageAction = await maybePromptPageAction(page_info);
    const pageParams = pageAction && paramsForPageAction(pageAction, page_info);

    if (pageParams) {
      this.log("\n");

      const nextData = await this.request(pageParams);
      return this.render(nextData);
    }
  }
}
