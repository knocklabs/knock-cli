import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { formatErrors, SourceError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import { AnyObj, omitDeep } from "@/lib/helpers/object.isomorphic";
import {
  joinExtractedFiles,
  JoinExtractedFilesResult,
} from "@/lib/marshal/shared/helpers";
import { WorkflowDirContext } from "@/lib/run-context";

import {
  isWorkflowDir,
  lsWorkflowJson,
  WorkflowCommandTarget,
} from "./helpers";
import { WORKFLOW_JSON } from "./processor.isomorphic";

// Hydrated workflow directory context with its content.
export type WorkflowDirData = WorkflowDirContext & {
  content: AnyObj;
};

/*
 * The main read function that takes the workflow directory context, then reads
 * the workflow json from the file system and returns the workflow data obj.
 */
type ReadWorkflowDirOpts = {
  withExtractedFiles?: boolean;
};

export const readWorkflowDir = async (
  workflowDirCtx: WorkflowDirContext,
  opts: ReadWorkflowDirOpts = {},
): Promise<ParseJsonResult | JoinExtractedFilesResult> => {
  const { abspath } = workflowDirCtx;
  const { withExtractedFiles = false } = opts;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const workflowJsonPath = await lsWorkflowJson(abspath);
  if (!workflowJsonPath)
    throw new Error(`${abspath} is not a workflow directory`);

  const result = await readJson(workflowJsonPath);
  if (!result[0]) return result;

  let [workflowJson] = result;

  workflowJson = omitDeep(workflowJson, ["__readonly"]);

  return withExtractedFiles
    ? joinExtractedFiles(workflowDirCtx, workflowJson, WORKFLOW_JSON)
    : [workflowJson, []];
};

/*
 * For the given list of workflow directory contexts, read each workflow dir and
 * return workflow directory data.
 */
const readWorkflowDirs = async (
  workflowDirCtxs: WorkflowDirContext[],
  opts: ReadWorkflowDirOpts = {},
): Promise<[WorkflowDirData[], SourceError[]]> => {
  const workflows: WorkflowDirData[] = [];
  const errors: SourceError[] = [];

  for (const workflowDirCtx of workflowDirCtxs) {
    // eslint-disable-next-line no-await-in-loop
    const [workflow, readErrors] = await readWorkflowDir(workflowDirCtx, opts);

    if (readErrors.length > 0) {
      const workflowJsonPath = path.resolve(
        workflowDirCtx.abspath,
        WORKFLOW_JSON,
      );
      const e = new SourceError(formatErrors(readErrors), workflowJsonPath);
      errors.push(e);
      continue;
    }

    workflows.push({ ...workflowDirCtx, content: workflow! });
  }

  return [workflows, errors];
};

/*
 * List and read all workflow directories found for the given command target.
 *
 * Note, it assumes the valid command target.
 */
export const readAllForCommandTarget = async (
  target: WorkflowCommandTarget,
  opts: ReadWorkflowDirOpts = {},
): Promise<[WorkflowDirData[], SourceError[]]> => {
  const { type: targetType, context: targetCtx } = target;

  if (!targetCtx.exists) {
    const subject =
      targetType === "workflowDir"
        ? "a workflow directory at"
        : "workflow directories in";

    return ux.error(`Cannot locate ${subject} \`${targetCtx.abspath}\``);
  }

  switch (targetType) {
    case "workflowDir": {
      return readWorkflowDirs([targetCtx], opts);
    }

    case "workflowsIndexDir": {
      const dirents = await fs.readdir(targetCtx.abspath, {
        withFileTypes: true,
      });

      const promises = dirents.map(async (dirent) => {
        const abspath = path.resolve(targetCtx.abspath, dirent.name);
        const workflowDirCtx: WorkflowDirContext = {
          type: "workflow",
          key: dirent.name,
          abspath,
          exists: await isWorkflowDir(abspath),
        };
        return workflowDirCtx;
      });

      const workflowDirCtxs = (await Promise.all(promises)).filter(
        (workflowDirCtx) => workflowDirCtx.exists,
      );
      return readWorkflowDirs(workflowDirCtxs, opts);
    }

    default:
      throw new Error(`Invalid workflow command target: ${target}`);
  }
};
