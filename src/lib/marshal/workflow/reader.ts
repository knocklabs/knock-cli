import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";
import { hasIn, set } from "lodash";

import { formatErrors, JsonDataError, SourceError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import {
  AnyObj,
  getLastFound,
  mapValuesDeep,
  ObjPath,
  omitDeep,
} from "@/lib/helpers/object";
import {
  checkIfValidExtractedFilePathFormat,
  FILEPATH_MARKED_RE,
  readExtractedFileSync,
} from "@/lib/marshal/shared/helpers";
import { WorkflowDirContext } from "@/lib/run-context";

import {
  isWorkflowDir,
  lsWorkflowJson,
  WORKFLOW_JSON,
  WorkflowCommandTarget,
} from "./helpers";

// Hydrated workflow directory context with its content.
export type WorkflowDirData = WorkflowDirContext & {
  content: AnyObj;
};

// For now we support up to two levels of content extraction in workflow.json.
// (e.g. workflow.json, then visual_blocks.json)
const MAX_EXTRACTION_LEVEL = 2;

/*
 * Validate the extracted file path based on its format and uniqueness (but not
 * the presence).
 *
 * Note, the uniqueness check is based on reading from and writing to
 * uniqueFilePaths, which is MUTATED in place.
 */
const validateExtractedFilePath = (
  val: unknown,
  workflowDirCtx: WorkflowDirContext,
  uniqueFilePaths: Record<string, boolean>,
  objPathToFieldStr: string,
): JsonDataError | undefined => {
  const workflowJsonPath = path.resolve(workflowDirCtx.abspath, WORKFLOW_JSON);

  // Validate the file path format, and that it is unique per workflow.
  if (
    !checkIfValidExtractedFilePathFormat(val, workflowJsonPath) ||
    typeof val !== "string" ||
    val in uniqueFilePaths
  ) {
    const error = new JsonDataError(
      "must be a relative path string to a unique file within the directory",
      objPathToFieldStr,
    );

    return error;
  }

  // Keep track of all the valid extracted file paths that have been seen, so
  // we can validate each file path's uniqueness as we traverse.
  uniqueFilePaths[val] = true;
  return undefined;
};

/*
 * Given a workflow json object, compiles all referenced extracted files from it
 * and returns the updated object with the extracted content joined and inlined.
 *
 * Important things to keep in mind:
 * 1. There can be multiple places in workflow json where content extraction
 *    happens.
 * 2. There can be multiple levels of content extraction happening, currently
 *    at a maximum of 2 levels. For example, workflow.json links to
 *    visual_blocks.json, and in return visual_blocks.json links to a markdown
 *    file for its block content. Any referenced extracted paths should be
 *    expressed *as a relative path to the file it is referenced in*.
 *
 * The way this function works and handles above two points, is by:
 * 1. Traversing the entire given workflow json node from root to leaf and
 *    discovering extracted paths, without knowing about any specific fields
 *    extracted.
 * 2. Whenever it discovers an extracted path, it reads the linked file and
 *    inlines the content into the node. If the inlined content itself contains
 *    extracted paths, then it "rebase"s the file paths to be relative to the
 *    location of the workflow json.
 * 3. This traversal takes place for the maximum levels of content extraction
 *    supported (currently 2 levels).
 *
 * Note, this function is meant to be PRIVATE and MUTATES the workflow json obj.
 *
 * TODO: Include links to docs in the error message when ready.
 */
type JoinExtractedFilesResult = [AnyObj, JsonDataError[]];
type JoinedFilePaths = Record<string, string>;

const joinExtractedFiles = async (
  workflowDirCtx: WorkflowDirContext,
  workflowJson: AnyObj,
): Promise<JoinExtractedFilesResult> => {
  // Tracks any errors encountered during traversal. Mutated in place.
  const errors: JsonDataError[] = [];

  // Tracks each new valid extracted file path seen (rebased to be relative to
  // workflow.json) in the workflow json node. Mutated in place, and used
  // to validate the uniqueness of an extracted path encountered.
  const uniqueFilePaths = {};

  // Tracks each extracted file path (rebased) that gets inlined with its object
  // path location, per each traversal iteration. Mutated in place, and used for
  // rebasing an extracted path to be relative to the location of the workflow
  // json file.
  const joinedFilePathsPerLevel: JoinedFilePaths[] = [];

  for (const [idx] of Array.from({ length: MAX_EXTRACTION_LEVEL }).entries()) {
    const currJoinedFilePaths: JoinedFilePaths = {};
    const prevJoinedFilePaths = joinedFilePathsPerLevel[idx - 1] || {};

    mapValuesDeep(workflowJson, (value, key, parts) => {
      // If not marked with the @ suffix, there's nothing to do.
      if (!FILEPATH_MARKED_RE.test(key)) return;

      const objPathToFieldStr = ObjPath.stringify(parts);
      const inlinObjPathStr = objPathToFieldStr.replace(FILEPATH_MARKED_RE, "");

      // If there is inlined content present already, then nothing more to do.
      if (hasIn(workflowJson, inlinObjPathStr)) return;

      // Check if the extracted path found at the current field path belongs to
      // a node whose parent or grandparent has been previously joined earlier
      // in the tree. If so, rebase the extracted path to be a relative path to
      // the workflow json.
      const lastFound = getLastFound(prevJoinedFilePaths, parts);
      const prevJoinedFilePath =
        typeof lastFound === "string" ? lastFound : undefined;

      const rebasedFilePath = prevJoinedFilePath
        ? path.join(path.dirname(prevJoinedFilePath), value)
        : value;

      const invalidFilePathError = validateExtractedFilePath(
        rebasedFilePath,
        workflowDirCtx,
        uniqueFilePaths,
        objPathToFieldStr,
      );
      if (invalidFilePathError) {
        errors.push(invalidFilePathError);

        // Wipe the invalid file path in the node so the final workflow json
        // object ends up with only valid file paths, this way workflow writer
        // can see only valid file paths and use those when pulling. Also set
        // the inlined field path in workflow object with empty content so we
        // know we've looked at this extracted file path.
        set(workflowJson, objPathToFieldStr, undefined);
        set(workflowJson, inlinObjPathStr, undefined);

        return;
      }

      // By this point we have a valid extracted file path, so attempt to read
      // the file at the file path.
      const [content, readExtractedFileError] = readExtractedFileSync(
        rebasedFilePath,
        workflowDirCtx,
        objPathToFieldStr,
      );
      if (readExtractedFileError) {
        errors.push(readExtractedFileError);

        // Replace the extracted file path with the rebased one, and set the
        // inlined field path in workflow object with empty content, so we know
        // we do not need to try inlining again.
        set(workflowJson, objPathToFieldStr, rebasedFilePath);
        set(workflowJson, inlinObjPathStr, undefined);

        return;
      }

      // Inline the file content and replace the extracted file path with a
      // rebased one.
      set(workflowJson, objPathToFieldStr, rebasedFilePath);
      set(workflowJson, inlinObjPathStr, content);

      // Track joined file paths from the current join level.
      set(currJoinedFilePaths, inlinObjPathStr, rebasedFilePath);
    });

    // Finally save all the joined file paths from this traversal iteration.
    joinedFilePathsPerLevel[idx] = currJoinedFilePaths;
  }

  return [workflowJson, errors];
};

/*
 * The main read function that takes the workflow directory context, then reads
 * the workflow json from the file system and returns the workflow data obj.
 */
type ReadWorkflowDirOpts = {
  withExtractedFiles?: boolean;
  withReadonlyField?: boolean;
};

export const readWorkflowDir = async (
  workflowDirCtx: WorkflowDirContext,
  opts: ReadWorkflowDirOpts = {},
): Promise<ParseJsonResult | JoinExtractedFilesResult> => {
  const { abspath } = workflowDirCtx;
  const { withExtractedFiles = false, withReadonlyField = false } = opts;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const workflowJsonPath = await lsWorkflowJson(abspath);
  if (!workflowJsonPath)
    throw new Error(`${abspath} is not a workflow directory`);

  const result = await readJson(workflowJsonPath);
  if (!result[0]) return result;

  let [workflowJson] = result;

  workflowJson = withReadonlyField
    ? workflowJson
    : omitDeep(workflowJson, ["__readonly"]);

  return withExtractedFiles
    ? joinExtractedFiles(workflowDirCtx, workflowJson)
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
