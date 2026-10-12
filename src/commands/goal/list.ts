import { Goal } from "@knocklabs/mgmt/resources/goals";
import { ux } from "@oclif/core";

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

type ListGoalData = {
  entries: Goal[];
  page_info: PageInfo;
};

export default class GoalList extends BaseCommand<typeof GoalList> {
  static summary = "Display all goals for an environment.";

  static flags = {
    environment: CustomFlags.environment,
    ...pageFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<ListGoalData | void> {
    const data = await this.request();

    const { flags } = this.props;
    if (flags.json) return data;

    return this.render(data);
  }

  async request(
    pageParams: { after?: string; before?: string } = {},
  ): Promise<ListGoalData> {
    const { flags } = this.props;

    spinner.start("‣ Loading");

    try {
      const page = await this.apiV1.mgmtClient.goals.list({
        environment: flags.environment,
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

  async render(data: ListGoalData): Promise<void> {
    const { entries } = data;

    const scope = formatCommandScope(this.props.flags);
    this.log(`‣ Showing ${entries.length} goals in ${scope}\n`);

    ux.table(entries as unknown as Record<string, unknown>[], {
      key: {
        header: "Key",
      },
      name: {
        header: "Name",
      },
      event_type: {
        header: "Event type",
        get: (entry) => (entry as unknown as Goal).condition.event.event_type,
      },
      event_key: {
        header: "Event key",
        get: (entry) => (entry as unknown as Goal).condition.event.event_key,
      },
      updated_at: {
        header: "Updated at",
        get: (entry) => formatDate(entry.updated_at as string),
      },
    });

    return this.prompt(data);
  }

  async prompt(data: ListGoalData): Promise<void> {
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
