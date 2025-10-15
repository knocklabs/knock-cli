import * as path from "node:path";

import { Args, Flags } from "@oclif/core";
import * as fs from "fs-extra";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { spinner } from "@/lib/helpers/ux";
import * as Workflow from "@/lib/marshal/workflow";
import { WorkflowDirContext } from "@/lib/run-context";

export default class WorkflowNew extends BaseCommand<typeof WorkflowNew> {
  static flags = {
    steps: Flags.string({ aliases: ["step"] }),
    force: Flags.boolean(),
    environment: Flags.string({ hidden: true, default: KnockEnv.Development }),
  };

  static args = {
    workflowKey: Args.string({
      required: true,
    }),
  };

  // TODO(KNO-3072): Unhide after we move the generator logic to the backend.
  static hidden = true;

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
    if (pathExists && !flags.force) {
      return this.error(
        `Cannot overwrite an existing path at ${newWorkflowDirPath}` +
          " (use --force to overwrite)",
      );
    }

    spinner.stop();

    // 5-A. We are good to generate a new workflow directory.
    const dirContext: WorkflowDirContext = {
      type: "workflow",
      key: args.workflowKey,
      abspath: newWorkflowDirPath,
      exists: await Workflow.isWorkflowDir(newWorkflowDirPath),
    };
    const attrs = { name: args.workflowKey, steps };

    await Workflow.generateWorkflowDir(dirContext, attrs);
    this.log(
      `‣ Successfully generated a workflow directory at ${dirContext.abspath}`,
    );

    // 5-B. Lastly warn if this workflow already exists in Knock.
    const isExistingWorkflow = await this.checkExistingWorkflow();
    if (isExistingWorkflow) {
      this.log("");
      this.warn(
        `Workflow \`${args.workflowKey}\` already exists in \`${flags.environment}\` environment`,
      );
    }
  }

  async checkExistingWorkflow(): Promise<boolean | undefined> {
    try {
      const resp = await this.apiV1.getWorkflow(this.props);
      return resp.status === 200;
    } catch {}
  }
}
