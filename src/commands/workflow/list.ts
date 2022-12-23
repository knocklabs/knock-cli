import { Flags, CliUx } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import * as Workflow from "@/lib/marshal/workflow";
import {
  paginationFlags,
  Paginated,
  PageAction,
  formatPageActionPrompt,
  validatePageActionInput,
} from "@/lib/helpers/pagination";
import { formatDate } from "@/lib/helpers/date";

export default class WorkflowList extends BaseCommand {
  static flags = {
    environment: Flags.string({ default: "development" }),
    "hide-uncommitted-changes": Flags.boolean(),
    ...paginationFlags,
  };

  static enableJsonFlag = true;

  async run(): Promise<Paginated<Workflow.WorkflowPayload> | void> {
    const { flags } = this.props;

    const resp = await this.request();
    if (flags.json) return resp.data;

    this.display(resp.data);
  }

  async request(extraFlags = {}) {
    const flags = { ...this.props.flags, ...extraFlags };
    const props = { ...this.props, flags };

    CliUx.ux.action.start("‣ Loading");
    const resp = await this.apiV1.listWorkflows(props);

    CliUx.ux.action.stop();
    return resp;
  }

  async display(data: Paginated<Workflow.WorkflowPayload>) {
    const { environment: env } = this.props.flags;
    const { entries, page_info } = data;

    this.log(`‣ Showing ${entries.length} workflows in ${env} environment\n`);

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
        get: (entry) => Workflow.displayCategories(entry, { truncateAfter: 3 }),
      },
      updated_at: {
        header: "Updated at",
        get: (entry) => formatDate(entry.updated_at),
      },
    });

    // If we can move to a next or previous page, display a prompt to take a
    // user input.
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
      return;
    }
  }
}
