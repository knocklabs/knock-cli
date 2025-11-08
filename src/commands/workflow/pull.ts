import * as path from "node:path";

import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { MAX_PAGINATION_LIMIT, PageInfo } from "@/lib/helpers/page";
import {
  formatErrorRespMessage,
  isSuccessResp,
  withSpinner,
} from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import * as Workflow from "@/lib/marshal/workflow";
import {
  ensureResourceDirForTarget,
  ResourceTarget,
  WorkflowDirContext,
} from "@/lib/run-context";
import { resolveResourceDir } from "@/lib/helpers/project-config";

export default class WorkflowPull extends BaseCommand<typeof WorkflowPull> {
  static summary =
    "Pull one or more workflows from an environment into a local file system.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to pull all workflows from the specified environment.",
    }),
    "workflows-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all workflows into.",
      dependsOn: ["all"],
    }),
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  static args = {
    workflowKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    if (flags.all && args.workflowKey) {
      return this.error(
        `workflowKey arg \`${args.workflowKey}\` cannot also be provided when using --all`,
      );
    }

    return flags.all ? this.pullAllWorkflows() : this.pullOneWorkflow();
  }

  /*
   * Pull one workflow
   */

  async pullOneWorkflow(): Promise<void> {
    const { flags } = this.props;

    // 1. Retrieve or build a new workflow directory context.
    const dirContext = await this.getWorkflowDirContext();

    if (dirContext.exists) {
      this.log(`‣ Found \`${dirContext.key}\` at ${dirContext.abspath}`);
    } else {
      const prompt = `Create a new workflow directory \`${dirContext.key}\` at ${dirContext.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
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
    await Workflow.writeWorkflowDirFromData(dirContext, resp.data, {
      withSchema: true,
    });

    const action = dirContext.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath} using ${scope}`,
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

    // Default to knock project config first if present, otherwise cwd.
    const dirCtx = await resolveResourceDir(
      this.projectConfig,
      "workflow",
      runCwd,
    );

    // Not inside any existing workflow directory, which means either create a
    // new worfklow directory in the cwd, or update it if there is one already.
    if (workflowKey) {
      const dirPath = path.resolve(dirCtx.abspath, workflowKey);
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

  /*
   * Pull all workflows
   */

  async pullAllWorkflows(): Promise<void> {
    const { flags } = this.props;

    const workflowsIndexDirCtx = await resolveResourceDir(
      this.projectConfig,
      "workflow",
      this.runContext.cwd,
    );

    const targetDirCtx = flags["workflows-dir"] || workflowsIndexDirCtx;

    const prompt = targetDirCtx.exists
      ? `Pull latest workflows into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new workflows directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    // Fetch all workflows then write them to the local file system.
    spinner.start(`‣ Loading`);

    const workflows = await this.listAllWorkflows();
    await Workflow.writeWorkflowsIndexDir(targetDirCtx, workflows, {
      withSchema: true,
    });
    spinner.stop();

    const action = targetDirCtx.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} the workflows directory at ${targetDirCtx.abspath} using ${scope}`,
    );
  }

  async listAllWorkflows(
    pageParams: Partial<PageInfo> = {},
    workflowsFetchedSoFar: Workflow.WorkflowData<WithAnnotation>[] = [],
  ): Promise<Workflow.WorkflowData<WithAnnotation>[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        annotate: true,
        limit: MAX_PAGINATION_LIMIT,
      },
    });

    const resp = await this.apiV1.listWorkflows<WithAnnotation>(props);
    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const workflows = [...workflowsFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllWorkflows({ after: pageInfo.after }, workflows)
      : workflows;
  }
}
