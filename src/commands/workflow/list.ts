import { CliUx, Flags } from "@oclif/core";
import { AxiosResponse } from "axios";

import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import {
  maybePromptPageAction,
  Paginated,
  paginationFlags,
  paramsForPageAction,
} from "@/lib/helpers/pagination";
import { withSpinner } from "@/lib/helpers/request";
import * as Workflow from "@/lib/marshal/workflow";

export default class WorkflowList extends BaseCommand {
  static flags = {
    environment: Flags.string({ default: "development" }),
    "hide-uncommitted-changes": Flags.boolean(),
    ...paginationFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<Paginated<Workflow.WorkflowData> | void> {
    const resp = await this.request();

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.display(resp.data);
  }

  async request(
    pageParams = {},
  ): Promise<AxiosResponse<Paginated<Workflow.WorkflowData>>> {
    const flags = { ...this.props.flags, ...pageParams };
    const props = { ...this.props, flags };

    return withSpinner<Paginated<Workflow.WorkflowData>>(() =>
      this.apiV1.listWorkflows(props),
    );
  }

  async display(data: Paginated<Workflow.WorkflowData>): Promise<void> {
    const { entries, page_info } = data;
    const { environment: env, "hide-uncommitted-changes": commitedOnly } =
      this.props.flags;

    const qualifier =
      env === "development" && !commitedOnly ? "(including uncommitted)" : "";

    this.log(
      `‣ Showing ${entries.length} workflows in \`${env}\` environment ${qualifier}\n`,
    );

    /*
     * Workflows list table
     */

    CliUx.ux.table(entries, {
      key: {
        header: "Key",
      },
      name: {
        header: "Name",
      },
      status: {
        header: "Status",
        get: (entry) => (entry.active ? "active" : "inactive"),
      },
      categories: {
        header: "Categories",
        get: (entry) => Workflow.formatCategories(entry, { truncateAfter: 3 }),
      },
      steps: {
        header: "Steps",
        get: (entry) => (entry.steps.length > 0 ? entry.steps.length : "-"),
      },
      updated_at: {
        header: "Updated at",
        get: (entry) => formatDate(entry.updated_at),
      },
    });

    const pageAction = await maybePromptPageAction(page_info);
    const pageParams = pageAction && paramsForPageAction(pageAction, page_info);

    if (pageParams) {
      this.log("\n");

      const resp = await this.request(pageParams);
      return this.display(resp.data);
    }
  }
}
