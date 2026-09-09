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
import * as Goal from "@/lib/marshal/goal";

export default class GoalList extends BaseCommand<typeof GoalList> {
  static summary = "Display all goals for an environment.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    ...pageFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.ListGoalResp | void> {
    const resp = await this.request();

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  async request(pageParams = {}): Promise<AxiosResponse<ApiV1.ListGoalResp>> {
    const props = merge(this.props, { flags: { ...pageParams } });

    return withSpinner<ApiV1.ListGoalResp>(() => this.apiV1.listGoals(props));
  }

  async render(data: ApiV1.ListGoalResp): Promise<void> {
    const { entries } = data;

    const scope = formatCommandScope(this.props.flags);
    this.log(`‣ Showing ${entries.length} goals in ${scope}\n`);

    ux.table(entries, {
      key: {
        header: "Key",
      },
      name: {
        header: "Name",
      },
      status: {
        header: "Status",
        get: (entry) => Goal.formatStatus(entry),
      },
      target: {
        header: "Target",
        get: (entry) => {
          const { type, threshold, unit } = entry.target;
          if (threshold !== undefined) {
            return unit
              ? `${type}: ${threshold} ${unit}`
              : `${type}: ${threshold}`;
          }

          return type;
        },
      },
      window: {
        header: "Window",
        get: (entry) => `${entry.window.size} ${entry.window.unit}`,
      },
      tags: {
        header: "Tags",
        get: (entry) => Goal.formatTags(entry, { truncateAfter: 3 }),
      },
      updated_at: {
        header: "Updated at",
        get: (entry) => formatDate(entry.updated_at),
      },
    });

    return this.prompt(data);
  }

  async prompt(data: ApiV1.ListGoalResp): Promise<void> {
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
