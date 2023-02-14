import * as path from "node:path";

import * as fs from "fs-extra";
import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { WorkflowDirContext } from "@/lib/helpers/dir-context";
import * as Workflow from "@/lib/marshal/workflow";

export default class WorkflowNew extends BaseCommand {
  static flags = { steps: Flags.string({ aliases: ["step"] }) };

  static args = [{ name: "workflowKey", required: true }];

  async run(): Promise<void> {
    const { args, flags } = this.props;
    const { cwd, resourceDir } = this.runContext;

    // 1. Ensure we aren't in any existing resource directory already.
    // TODO: In the future, we should also probably check for the project
    // context and if we are in /workflows directory.
    if (resourceDir) {
      return this.error(
        `Cannot run ${BaseCommand.id} inside another ${resourceDir.type} directory`,
      );
    }

    // 2. Ensure the workflow key is in the valid format.
    const workflowKeyError = Workflow.validateWorkflowKey(args.workflowKey);
    if (workflowKeyError) {
      return this.error(
        `Invalid workflow key \`${args.workflowKey}\`, ${workflowKeyError}`,
      );
    }

    // 3. Ensure not to overwrite any existing path.
    const newWorkflowDirPath = path.join(cwd, args.workflowKey);
    const exists = await fs.pathExists(newWorkflowDirPath);
    if (exists) {
      return this.error(
        `Cannot overwrite an existing path at ${newWorkflowDirPath}`,
      );
    }

    // 4. Parse and validate the steps flag, if given.
    const [steps, stepsError] = Workflow.parseStepsInput(flags.steps || "");
    if (stepsError) {
      return this.error(`Invalid steps \`${flags.steps}\`, ${stepsError}`);
    }

    // 5. Generate a new workflow directory.
    const dirContext: WorkflowDirContext = {
      type: "workflow",
      key: args.workflowKey,
      abspath: newWorkflowDirPath,
      exists: false,
    };
    const attrs = { name: flags.name || args.workflowKey, steps };

    await Workflow.generateWorkflowDir(dirContext, attrs);
    this.log(
      `‣ Successfully generated a new workflow directory at ${dirContext.abspath}`,
    );
  }
}
