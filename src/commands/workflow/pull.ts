import { Flags } from "@oclif/core";
import * as fs from "fs-extra";

import BaseCommand from "@/lib/base-command";

export default class WorkflowPull extends BaseCommand {
  static flags = {
    "hide-uncommitted-changes": Flags.boolean(),
  };

  static args = [{ name: "workflowKey", required: true }];

  async run(): Promise<void> {
    const flags = { ...this.props.flags, annotate: true };

    const resp = await this.apiV1.getWorkflow({ ...this.props, flags });

    const { workflowKey } = this.props.args;
    const workflowFilePath = `./${workflowKey}/workflow.json`;

    // XXX: Strip out annotations and extract out templates..
    try {
      await fs.outputJson(workflowFilePath, resp.data, { spaces: "\t" });
    } catch (err) {
      console.error(err);
    }
  }
}
