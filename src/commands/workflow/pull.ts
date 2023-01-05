import * as path from "node:path";

import { Flags } from "@oclif/core";
import enquirer from "enquirer";

import BaseCommand from "@/lib/base-command";
import { withSpinner } from "@/lib/helpers/request";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import * as Workflow from "@/lib/marshal/workflow";
import { WorkflowDirContext } from "@/lib/run-context";

const promptToConfirm = async ({
  key,
}: WorkflowDirContext): Promise<string | undefined> => {
  try {
    const { input } = await enquirer.prompt<{ input: string }>({
      type: "confirm",
      name: "input",
      message: `Create a new workflow directory at ./${key}?`,
    });
    return input;
  } catch (error) {
    console.log(error);
  }
};

export default class WorkflowPull extends BaseCommand {
  static flags = {
    environment: Flags.string({ default: "development" }),
    "hide-uncommitted-changes": Flags.boolean(),
  };

  static args = [{ name: "workflowKey", required: false }];

  async run(): Promise<void> {
    // 1. Retrieve or build a new workflow directory context.
    const workflowDirCtx = await this.getWorkflowDirContext();

    if (workflowDirCtx.exists) {
      this.log(
        `‣ Found \`${workflowDirCtx.key}\` at ${workflowDirCtx.abspath}`,
      );
    } else {
      const input = await promptToConfirm(workflowDirCtx);
      if (!input) return;
    }

    // 2. Fetch the workflow with annotations.
    const resp = await withSpinner<Workflow.WorkflowData<WithAnnotation>>(
      () => {
        const flags = { ...this.props.flags, annotate: true };
        return this.apiV1.getWorkflow({ ...this.props, flags });
      },
    );

    // 3. Write the workflow with the workflow directory context.
    await Workflow.writeWorkflowDir(resp.data, workflowDirCtx);

    const action = workflowDirCtx.exists ? "Updated" : "Created";
    this.log(
      `‣ ${action} \`${workflowDirCtx.key}\` at ${workflowDirCtx.abspath}`,
    );
  }

  async getWorkflowDirContext(): Promise<WorkflowDirContext> {
    const { workflowKey } = this.props.args;

    const {
      // TODO: In the future this might be a different resource dir like layout.
      resourceDir: workflowDirCtx,
      cwd: runCwd,
    } = this.runContext;

    if (workflowDirCtx) {
      // The command was invoked somewhere inside the existing workflow dir.

      if (!workflowKey) {
        // Workflow key arg was not provided with the command, but we can infer
        // from the current workflow directory context.
        return workflowDirCtx;
      }

      if (workflowKey === workflowDirCtx.key) {
        // Workflow key arg was provided and matches the current workflow
        // directory context.
        return workflowDirCtx;
      }

      // The workflow key arg provided conflicts with the current workflow
      // directory context, so return an error instead of creating a nested
      // workflow directory.
      return this.error(
        `Cannot pull \`${workflowKey}\` inside another workflow directory:\n${workflowDirCtx.key}`,
      );
    }

    if (!workflowKey) {
      // Not in any workflow directory context, which means a workflow key arg
      // must be provided, so return an error.
      return this.error("Missing 1 required arg:\nworkflowKey");
    }

    // Not inside any existing workflow directory, which means we either create
    // a new worfklow directory in the cwd, or update it if there is one already.
    const dirPath = path.resolve(runCwd, workflowKey);
    const exists = await Workflow.isWorkflowDir(dirPath);

    return {
      type: "workflow",
      key: workflowKey,
      abspath: dirPath,
      exists,
    };
  }
}
