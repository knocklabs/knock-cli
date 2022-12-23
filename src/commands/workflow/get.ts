import { Flags, CliUx } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import * as Workflow from "@/lib/marshal/workflow";
import { formatDateTime } from "@/lib/helpers/date";

export default class WorkflowGet extends BaseCommand {
  static flags = {
    environment: Flags.string({ default: "development" }),
    "hide-uncommitted-changes": Flags.boolean(),
  };

  static args = [{ name: "workflowKey", required: true }];

  static enableJsonFlag = true;

  async run(): Promise<Workflow.WorkflowPayload | void> {
    const { flags } = this.props;

    const resp = await this.request();
    if (flags.json) return resp.data;

    this.display(resp.data)
  }

  async request() {
    CliUx.ux.action.start("‣ Loading");
    const resp = await this.apiV1.getWorkflow(this.props);

    CliUx.ux.action.stop();
    return resp;
  }

  async display(workflow: Workflow.WorkflowPayload) {
    const { environment: env } = this.props.flags;
    const { workflowKey } = this.props.args;

    this.log(`‣ Showing workflow \`${workflowKey}\` in ${env} environment\n`);

    const rows = [
      {
        key: "Status",
        value: Workflow.displayStatus(workflow),
      },
      {
        key: "Name",
        value: workflow.name,
      },
      {
        key: "Key",
        value: workflow.key,
      },
      {
        key: "Description",
        value: workflow.description || "-",
      },
      {
        key: "Categories",
        value: Workflow.displayCategories(workflow, { emptyDisplay: "-" }),
      },
      {
        key: "Created at",
        value: formatDateTime(workflow.created_at),
      },
      {
        key: "Updated at",
        value: formatDateTime(workflow.updated_at),
      },
      // XXX: Add steps info.
    ];

    CliUx.ux.table(rows, {
      key: {
        header: "Property",
        minWidth: 24,
      },
      value: {
        header: "Value",
      },
    });
  }
}
