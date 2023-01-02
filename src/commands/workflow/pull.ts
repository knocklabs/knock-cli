import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { withSpinner } from "@/lib/helpers/request";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import * as Workflow from "@/lib/marshal/workflow";

export default class WorkflowPull extends BaseCommand {
  static flags = {
    environment: Flags.string({ default: "development" }),
    "hide-uncommitted-changes": Flags.boolean(),
  };

  static args = [{ name: "workflowKey", required: true }];

  async run(): Promise<void> {
    const flags = { ...this.props.flags, annotate: true };

    const resp = await withSpinner<Workflow.WorkflowData<WithAnnotation>>(() =>
      this.apiV1.getWorkflow({ ...this.props, flags }),
    );

    return Workflow.writeWorkflowDir(resp.data);
  }
}