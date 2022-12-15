import { Flags, CliUx } from '@oclif/core'

import BaseCommand from "@/lib/base-command";
import { paginationFlags } from "@/lib/v1/flag-helpers";

export default class WorkflowList extends BaseCommand {
  static flags = {
    environment: Flags.string({default: 'development'}),
    annotate: Flags.boolean({hidden: true}),
    "hide-uncommitted-changes": Flags.boolean(),
    ...paginationFlags
  }

  static enableJsonFlag = true

  async run(): Promise<void> {
    return this.handle()
  }

  async handle(): Promise<void> {
    const { flags } = this.props;

    const resp = await this.apiV1.listWorkflows(this.props);
    if (flags.json) return resp.data

    // TODO: Fully flesh the table out, and allow moving through pages.
    CliUx.ux.table(resp.data.entries, {
      key: {
        header: 'Workflow key'
      },
      status: {
        header: 'Status',
        get: row => row.active ? "active" : "inactive"
      },
      categories: {
        header: 'Categories',
        // TODO: Type this payload?
        get: (row: any) => row.categories ? row.categories.join(", ") : ""
      }
    })
  }
}
