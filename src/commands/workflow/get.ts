import { Flags, CliUx } from '@oclif/core'

import BaseCommand from "@/lib/base-command";

export default class WorkflowGet extends BaseCommand {
  static flags = {
    environment: Flags.string({default: 'development'}),
    "hide-uncommitted-changes": Flags.boolean(),
  }

  static args = [
    { name: 'workflowKey', required: true }
  ]

  static enableJsonFlag = true

  async run(): Promise<void> {
    return this.handle()
  }

  async handle(): Promise<void> {
    const { flags } = this.props;

    const resp = await this.apiV1.getWorkflow(this.props);
    if (flags.json) return resp.data

    // TODO: Fully flesh the table out.
    const rows = [
      {key: "active", value: resp.data.active},
      {key: "name", value: resp.data.name},
      {key: "description", value: resp.data.description},
      {key: "key", value: resp.data.key},
      {key: "categories", value: resp.data.categories ? resp.data.categories.join(", ") : ""},
    ]

    CliUx.ux.table(rows, {
      key: {
        header: 'Property',
      },
      value: {
        header: 'Value',
      },
    })
  }
}
