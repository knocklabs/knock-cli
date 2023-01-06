import * as path from "node:path";

import * as fs from "fs-extra";

import { readJson, ReadJsonResult } from "@/lib/helpers/json";
import { WorkflowDirContext } from "@/lib/run-context";

import { lsWorkflowJson } from "./helpers";

/*
 * Validate the file path format of an extracted template field. The file path
 * must be:
 *
 * 1) Expressed as a relative path.
 *
 *    For exmaple:
 *      subject@: "email_1/subject.html"              // GOOD
 *      subject@: "./email_1/subject.html"            // GOOD
 *      subject@: "/workflow-x/email_1/subject.html"  // BAD
 *
 * 2) The resolved path must be contained inside the workflow directory
 *
 *    For exmaple (workflow-y is a different workflow dir in this example):
 *      subject@: "./email_1/subject.html"              // GOOD
 *      subject@: "../workflow-y/email_1/subject.html"  // BAD
 *
 * Note: does not validate the presence of the file nor the uniqueness of the
 * file path.
 */
export const validateTemplateFilePathFormat = (
  relpath: string,
  workflowDirCtx: WorkflowDirContext,
): boolean => {
  if (path.isAbsolute(relpath)) return false;

  const abspath = path.resolve(workflowDirCtx.abspath, relpath);
  const pathDiff = path.relative(workflowDirCtx.abspath, abspath);

  return !pathDiff.startsWith("..");
};

/*
 * The main read function that takes the path to a workflow directory, then
 * reads from the file system.
 */
export const readWorkflowDir = async (
  dirPath: string,
): Promise<ReadJsonResult> => {
  const dirExists = await fs.pathExists(dirPath);
  if (!dirExists) throw new Error(`${dirPath} does not exist`);

  const workflowJsonPath = await lsWorkflowJson(dirPath);
  if (!workflowJsonPath)
    throw new Error(`${dirPath} is not a workflow directory`);

  const result = await readJson(workflowJsonPath);

  // TODO: For worklow push command, will need to compile and stitch together
  // template files with workflow, then validate the workflow and template
  // content.

  return result;
};
