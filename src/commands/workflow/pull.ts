import * as path from "node:path";

import { Flags } from "@oclif/core";
import enquirer from "enquirer";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import {
  ensureResourceDirForTarget,
  ResourceTarget,
  WorkflowDirContext,
} from "@/lib/helpers/dir-context";
import { merge } from "@/lib/helpers/object";
import { withSpinner } from "@/lib/helpers/request";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import * as Workflow from "@/lib/marshal/workflow";

const promptToConfirm = async ({
  key,
}: WorkflowDirContext): Promise<string | undefined> => {
  try {
    const { input } = await enquirer.prompt<{ input: string }>({
      type: "confirm",
      name: "input",
      message: `Create a new workflow directory \`${path.join(key, "/")}\`?`,
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
    const dirContext = await this.getWorkflowDirContext();

    if (dirContext.exists) {
      this.log(`‣ Found \`${dirContext.key}\` at ${dirContext.abspath}`);
    } else {
      const input = await promptToConfirm(dirContext);
      if (!input) return;
    }

    // 2. Fetch the workflow with annotations.
    const resp = await withSpinner<ApiV1.GetWorkflowResp<WithAnnotation>>(
      () => {
        const props = merge(this.props, {
          args: { workflowKey: dirContext.key },
          flags: { annotate: true },
        });

        return this.apiV1.getWorkflow(props);
      },
    );

    // 3. Write the fetched workflow to create or update the workflow directory.
    await Workflow.writeWorkflowDirFromData(dirContext, resp.data);

    const action = dirContext.exists ? "updated" : "created";
    this.log(
      `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath}`,
    );
  }

  async getWorkflowDirContext(): Promise<WorkflowDirContext> {
    const { workflowKey } = this.props.args;
    const { resourceDir, cwd: runCwd } = this.runContext;

    // Inside an existing resource dir, use it if valid for the target workflow.
    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: BaseCommand.id,
        type: "workflow",
        key: workflowKey,
      };

      return ensureResourceDirForTarget(
        resourceDir,
        target,
      ) as WorkflowDirContext;
    }

    // Not inside any existing workflow directory, which means either create a
    // new worfklow directory in the cwd, or update it if there is one already.
    if (workflowKey) {
      const dirPath = path.resolve(runCwd, workflowKey);
      const exists = await Workflow.isWorkflowDir(dirPath);

      return {
        type: "workflow",
        key: workflowKey,
        abspath: dirPath,
        exists,
      };
    }

    // Not in any workflow directory, nor a workflow key arg was given so error.
    return this.error("Missing 1 required arg:\nworkflowKey");
  }
}
