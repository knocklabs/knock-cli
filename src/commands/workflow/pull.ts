import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { WithAnnotation } from "@/lib/marshal/types";
import * as Workflow from "@/lib/marshal/workflow";

export default class WorkflowPull extends BaseCommand {
  static flags = {
    "hide-uncommitted-changes": Flags.boolean(),
  };

  static args = [{ name: "workflowKey", required: true }];

  // XXX: Test annotate param

  async run(): Promise<void> {
    const flags = { ...this.props.flags, annotate: true };

    const resp = await this.apiV1.getWorkflow<WithAnnotation>({
      ...this.props,
      flags,
    });

    try {
      await Workflow.writeWorkflowDir(resp.data);
    } catch (error) {
      console.error(error);
    }
  }
}
