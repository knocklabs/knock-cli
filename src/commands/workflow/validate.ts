import * as path from "node:path";

import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { formatErrors } from "@/lib/helpers/error";
import { AnyObj, merge } from "@/lib/helpers/object";
import { withSpinner } from "@/lib/helpers/request";
import * as Workflow from "@/lib/marshal/workflow";
import {
  ensureResourceDirForTarget,
  ResourceTarget,
  WorkflowDirContext,
} from "@/lib/run-context";

export default class WorkflowValidate extends BaseCommand {
  static flags = {
    environment: Flags.string({
      summary:
        "Validating a workflow is only done in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
  };

  static args = [{ name: "workflowKey", required: false }];

  async run(): Promise<ApiV1.ValidateWorkflowResp | void> {
    // 1. Retrieve the target workflow directory context.
    const dirContext = await this.getWorkflowDirContext();

    this.log(`‣ Reading \`${dirContext.key}\` at ${dirContext.abspath}`);

    // 2. Read the workflow.json with its template files.
    const [workflow, errors] = await Workflow.readWorkflowDir(dirContext, {
      withTemplateFiles: true,
    });
    if (errors.length > 0) {
      this.error(
        `Found the following errors in \`${dirContext.key}\` ${Workflow.WORKFLOW_JSON}\n\n` +
          formatErrors(errors),
      );
    }

    // 3. Validate the compiled workflow data.
    await withSpinner<ApiV1.ValidateWorkflowResp>(
      () => {
        const props = merge(this.props, {
          args: { workflowKey: dirContext.key },
        });

        return this.apiV1.validateWorkflow(props, workflow as AnyObj);
      },
      { action: "‣ Validating" },
    );

    this.log(`‣ Successfully validated \`${dirContext.key}\``);
  }

  async getWorkflowDirContext(): Promise<WorkflowDirContext> {
    const { workflowKey } = this.props.args;
    const { resourceDir, cwd: runCwd } = this.runContext;

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

    if (workflowKey) {
      const dirPath = path.resolve(runCwd, workflowKey);
      const exists = await Workflow.isWorkflowDir(dirPath);

      return exists
        ? {
            type: "workflow",
            key: workflowKey,
            abspath: dirPath,
            exists,
          }
        : this.error(
            `Cannot locate a workflow directory for \`${workflowKey}\``,
          );
    }

    return this.error("Missing 1 required arg:\nworkflowKey");
  }
}
