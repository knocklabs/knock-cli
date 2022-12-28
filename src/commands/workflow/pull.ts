import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import * as Workflow from "@/lib/marshal/workflow";
import { WithAnnotation } from "@/lib/marshal/types";

export default class WorkflowPull extends BaseCommand {
  static flags = {
    "hide-uncommitted-changes": Flags.boolean(),
  };

  static args = [{ name: "workflowKey", required: true }];

  async run(): Promise<void> {
    const flags = { ...this.props.flags, annotate: true };

    const resp = await this.apiV1.getWorkflow<WithAnnotation>({
      ...this.props,
      flags,
    });

    // XXX: async vs sync..?

    try {
      await Workflow.writeWorkflowDir(resp.data);
    } catch (err) {
      console.error(err);
    }
  }
}
