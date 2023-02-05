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
    "pull-to-refresh": Flags.boolean({ default: false }),
  };

  static args = [{ name: "workflowKey", required: false }];

  async run(): Promise<ApiV1.UpsertWorkflowResp | void> {
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

    // 3. Push up the compiled workflow data.
    const resp = await withSpinner<ApiV1.UpsertWorkflowResp<WithAnnotation>>(
      () => {
        const props = merge(this.props, {
          args: { workflowKey: dirContext.key },
          flags: { annotate: true },
        });

        return this.apiV1.upsertWorkflow(props, workflow as AnyObj);
      },
    );

    // 4. Write to refresh the workflow directory with the successfully pushed
    // workflow payload from the server, if the option was given.
    const { "pull-to-refresh": pullToRefresh } = this.props.flags;

    if (pullToRefresh) {
      await Workflow.writeWorkflowDir(resp.data.workflow!, dirContext);
    }

    const action = pullToRefresh ? `, and refreshed ${dirContext.abspath}` : "";
    this.log(`‣ Successfully pushed \`${dirContext.key}\`` + action);
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