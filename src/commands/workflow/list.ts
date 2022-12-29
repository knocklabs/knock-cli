import { CliUx, Flags } from "@oclif/core";
import { AxiosResponse } from "axios";

import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import {
  formatPageActionPrompt,
  PageAction,
  Paginated,
  paginationFlags,
  validatePageActionInput,
} from "@/lib/helpers/pagination";
import { withSpinner } from "@/lib/helpers/request";
import { WorkflowData } from "@/lib/marshal/workflow";
import * as Workflow from "@/lib/marshal/workflow";

export default class WorkflowList extends BaseCommand {
  static flags = {
    environment: Flags.string({ default: "development" }),
    "hide-uncommitted-changes": Flags.boolean(),
    ...paginationFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<Paginated<WorkflowData> | void> {
    const resp = await this.request();

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.display(resp.data);
  }

  async request(
    extraFlags = {},
  ): Promise<AxiosResponse<Paginated<WorkflowData>>> {
    const flags = { ...this.props.flags, ...extraFlags };
    const props = { ...this.props, flags };

    return withSpinner<Paginated<WorkflowData>>(() =>
      this.apiV1.listWorkflows(props),
    );
  }

  async display(data: Paginated<WorkflowData>): Promise<void> {
    const { entries } = data;
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
      name: {
        header: "Name",
        minWidth: 24,
      },
      key: {
        header: "Key",
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
        get: (entry) => entry.steps.length > 0 || "-",
      },
      updated_at: {
        header: "Updated at",
        get: (entry) => formatDate(entry.updated_at),
      },
    });

    this.handlePageActionPrompt(data);
  }

  async handlePageActionPrompt(data: Paginated<WorkflowData>): Promise<void> {
    const { page_info } = data;

    // If next or prev page is available, display a prompt to take a user input.
    const prompt = formatPageActionPrompt(page_info);
    if (!prompt) return;

    const input = await CliUx.ux.prompt(`? ${prompt}`, { required: false });
    const validAction = validatePageActionInput(input, page_info);
    if (!validAction) return;

    this.log("\n");

    // For a valid action, make a request for either previous or next page data.

    if (validAction === PageAction.Previous) {
      const resp = await this.request({ before: page_info.before });
      this.display(resp.data);
      return;
    }

    if (validAction === PageAction.Next) {
      const resp = await this.request({ after: page_info.after });
      this.display(resp.data);
    }
  }
}
