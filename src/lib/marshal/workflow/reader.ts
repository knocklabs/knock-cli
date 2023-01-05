import * as path from "node:path";

import * as fs from "fs-extra";

import { AnyObj } from "@/lib/helpers/object";
import { WorkflowDirContext } from "@/lib/run-context";

import { lsWorkflowJson } from "./helpers";

export const validateTemplateFilePath = (
  relpath: string,
  workflowDirCtx: WorkflowDirContext,
): boolean => {
  if (path.isAbsolute(relpath)) return false;

  const abspath = path.resolve(workflowDirCtx.abspath, relpath);
  const pathDiff = path.relative(workflowDirCtx.abspath, abspath);

  return !pathDiff.startsWith("..");
};

export const readWorkflowDir = async (dirPath: string): Promise<AnyObj> => {
  const dirExists = await fs.pathExists(dirPath);
  if (!dirExists) throw new Error(`${dirPath} does not exist`);

  const workflowJsonPath = await lsWorkflowJson(dirPath);
  if (!workflowJsonPath)
    throw new Error(`${dirPath} is not a workflow directory`);

  // TODO: In the future, will want to have options to dictate the read behavior,
  // such as compiling template files in the workflow directory, and validating
  // the file content etc.

  return fs.readJson(workflowJsonPath);
};
