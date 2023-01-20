import * as path from "node:path";

import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import {
  ensureResourceDirForTarget,
  ResourceTarget,
  WorkflowDirContext,
} from "@/lib/helpers/dir-context";
import { formatErrors } from "@/lib/helpers/error";
import { AnyObj, merge } from "@/lib/helpers/object";
import { withSpinner } from "@/lib/helpers/request";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import * as Workflow from "@/lib/marshal/workflow";

export default class WorkflowPush extends BaseCommand {
  static flags = {
    // TODO: Maybe make environments into an enum.
    environment: Flags.string({
      default: "development",
      options: ["development"],
    }),
  };

  static args = [{ name: "workflowKey", required: false }];

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.UpsertWorkflowResp | void> {
    const dirContext = await this.getWorkflowDirContext();

    this.log(`‣ Reading \`${dirContext.key}\` at ${dirContext.abspath}`);

    const [workflow, errors] = await Workflow.readWorkflowDir(dirContext, {
      withTemplateFiles: true,
    });
    if (errors.length > 0) {
      this.error(
        `Found the following errors in \`${dirContext.key}\` ${Workflow.WORKFLOW_JSON}\n\n` +
          formatErrors(errors),
      );
    }

    const resp = await withSpinner<ApiV1.UpsertWorkflowResp<WithAnnotation>>(
      () => {
        const props = merge(this.props, {
          args: { workflowKey: dirContext.key },
          flags: { annotate: true },
        });

        return this.apiV1.upsertWorkflow(props, workflow as AnyObj);
      },
    );

    const { flags } = this.props;
    if (flags.json) return resp.data;
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
        : this.error(`Cannot locate the workflow \`${workflowKey}\``);
    }

    return this.error("Missing 1 required arg:\nworkflowKey");
  }
}
