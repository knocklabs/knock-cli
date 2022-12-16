import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { writeWorkflowDir } from "@/lib/marshal/workflow";

export default class WorkflowPull extends BaseCommand {
  static flags = {
    "hide-uncommitted-changes": Flags.boolean(),
  };

  static args = [
    { name: "workflowKey", required: true }
  ];

  async run(): Promise<void> {
    const flags = { ...this.props.flags, annotate: true };
    const resp = await this.apiV1.getWorkflow({ ...this.props, flags });

    try {
      await writeWorkflowDir(resp.data)
    } catch (err) {
      console.error(err);
    }
  }
}
