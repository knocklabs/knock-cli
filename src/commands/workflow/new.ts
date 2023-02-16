import * as path from "node:path";

import { Flags } from "@oclif/core";
import * as fs from "fs-extra";

import BaseCommand from "@/lib/base-command";
import { WorkflowDirContext } from "@/lib/helpers/dir-context";
import { ApiError } from "@/lib/helpers/error";
import { formatErrorRespMessage } from "@/lib/helpers/request";
import * as spinner from "@/lib/helpers/spinner";
import * as Workflow from "@/lib/marshal/workflow";

export default class WorkflowNew extends BaseCommand {
  static flags = {
    steps: Flags.string({ aliases: ["step"] }),
    overwrite: Flags.boolean(),
  };

  static args = [{ name: "workflowKey", required: true }];

  async run(): Promise<void> {
    const { args, flags } = this.props;
    const { cwd, resourceDir } = this.runContext;

    spinner.start("‣ Validating");

    // 1. Ensure we aren't in any existing resource directory already.
    // TODO: In the future, maybe check for the project context and if we are in
    // /workflows directory.
    if (resourceDir) {
      return this.error(
        `Cannot generate inside an existing ${resourceDir.type} directory`,
      );
    }

    // 2. Ensure the workflow key is in the valid format.
    const workflowKeyError = Workflow.validateWorkflowKey(args.workflowKey);
    if (workflowKeyError) {
      return this.error(
        `Invalid workflow key \`${args.workflowKey}\` (${workflowKeyError})`,
      );
    }

    // 3. Parse and validate the steps flag, if given.
    const [steps, stepsError] = Workflow.parseStepsInput(flags.steps || "");
    if (stepsError) {
      return this.error(`Invalid --steps \`${flags.steps}\` (${stepsError})`);
    }

    // 4. Ensure not to overwrite any existing path accidentally.
    const newWorkflowDirPath = path.resolve(cwd, args.workflowKey);
    const pathExists = await fs.pathExists(newWorkflowDirPath);
    if (pathExists && !flags.overwrite) {
      return this.error(
        `Cannot overwrite an existing path at ${newWorkflowDirPath}` +
          " (use --overwrite flag to force)",
      );
    }

    // 5-A. If we are overwriting an existing workflow directory, proceed.
    const isWorkflowDir = await Workflow.isWorkflowDir(newWorkflowDirPath);
    if (isWorkflowDir && flags.overwrite) {
      return this.generateWorkflowDir(
        args.workflowKey,
        steps!,
        newWorkflowDirPath,
      );
    }

    // 5-B. Otherwise ensure this workflow does not exist in Knock already.
    const resp = await this.apiV1.getWorkflow(this.props);
    if (resp.status === 200) {
      return this.error(
        `Workflow \`${args.workflowKey}\` already exists in \`development\` environment` +
          ` (\`workflow pull ${args.workflowKey}\` first instead)`,
      );
    }

    if (resp.status !== 404) {
      const message = formatErrorRespMessage(resp);
      return this.error(new ApiError(message));
    }

    return this.generateWorkflowDir(
      args.workflowKey,
      steps!,
      newWorkflowDirPath,
    );
  }

  async generateWorkflowDir(
    workflowKey: string,
    steps: Workflow.StepTag[],
    newWorkflowDirPath: string,
  ): Promise<void> {
    spinner.stop();

    const dirContext: WorkflowDirContext = {
      type: "workflow",
      key: workflowKey,
      abspath: newWorkflowDirPath,
      exists: false,
    };
    const attrs = { name: workflowKey, steps };

    await Workflow.generateWorkflowDir(dirContext, attrs);
    this.log(
      `‣ Successfully generated a workflow directory at ${dirContext.abspath}`,
    );
  }
}
