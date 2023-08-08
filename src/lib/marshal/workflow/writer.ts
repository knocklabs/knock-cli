import * as path from "node:path";

import * as fs from "fs-extra";
import {
  cloneDeep,
  get,
  has,
  isPlainObject,
  set,
  uniqueId,
  unset,
} from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import {
  AnyObj,
  mapValuesDeep,
  ObjKeyOrArrayIdx,
  ObjPath,
  omitDeep,
  split,
} from "@/lib/helpers/object";
import { ExtractionSettings, WithAnnotation } from "@/lib/marshal/shared/types";
import { WorkflowDirContext } from "@/lib/run-context";

import {
  FILEPATH_MARKED_RE,
  FILEPATH_MARKER,
  isWorkflowDir,
  WORKFLOW_JSON,
} from "./helpers";
import { readWorkflowDir } from "./reader";
import { StepType, WorkflowData, WorkflowStepData } from "./types";

export type WorkflowDirBundle = {
  [relpath: string]: string;
};

/*
 * Sanitize the workflow content into a format that's appropriate for reading
 * and writing, by stripping out any annotation fields and handling readonly
 * fields.
 */
const toWorkflowJson = (workflow: WorkflowData<WithAnnotation>): AnyObj => {
  // Move read only fields of a workflow under the dedicated field "__readonly".
  const readonlyFields = workflow.__annotation?.readonly_fields || [];
  const [readonly, remainder] = split(workflow, readonlyFields);

  const worklfowJson = { ...remainder, __readonly: readonly };

  // Strip out all schema annotations, so not to expose them to end users.
  return omitDeep(worklfowJson, ["__annotation"]);
};

/*
 * Formats a file path for the extracted content based on the object path to the
 * field.
 *
 * Here's how it works:
 * 1. Each "key" part in the object path becomes a directory name if not the
 *    last one; if the last one, then it becomes a file name.
 *
 *    Example: ["template", "settings", "pre_content"] becomes..
 *    "template/settings/pre_content.txt"
 *
 * 2. Each "index" part in the object path gets appended to the next "key" part
 *    in the object path (converted to the 1-based index number).
 *
 *    Example: ["template", "visual_blocks", 0, "buttons", 0, "action"] becomes..
 *    "template/visual_blocks/1.buttons/1.action"
 *
 *    If the "index" part is the last in the object path parts, then it becomes
 *    the file name itself (but shouldn't happen).
 *
 * There are two options to transform the final output of the file path.
 * 1. `unnestDirsBy` takes out the first N parts in the object path parts,
 *    which effectively unnests N levels of directories in the formatted path.
 *
 *    Example: with unnestDirsBy of 1,
 *    ["template", "settings", "pre_content"] becomes..
 *    "settings/pre_content.txt"
 *
 * 2. `nestIntoDirs` nests the formatted path into the given directory parts.
 *    Example: with nestIntoDirs of ["email_1"] and unnestDirsBy of 1,
 *    ["template", "settings", "pre_content"] becomes..
 *    "email_1/settings/pre_content.txt"
 */
type FormatExtractedFilePathOpts = {
  unnestDirsBy?: number;
  nestIntoDirs?: string[];
};

const formatExtractedFilePath = (
  objPathParts: ObjKeyOrArrayIdx[],
  fileExt: string,
  opts: FormatExtractedFilePathOpts = {},
): string => {
  const { unnestDirsBy = 0, nestIntoDirs = [] } = opts;

  // 1. Unnest the obj path parts by the given depths, if the option is given.
  const maxUnnestableDepth = Math.min(
    Math.max(objPathParts.length - 1, 0),
    unnestDirsBy,
  );
  const unnestedObjPathParts = objPathParts.slice(
    maxUnnestableDepth,
    objPathParts.length,
  );

  // 2. Build the file path parts based on the object path parts.
  const filePathParts = [];
  let arrayIndexNums = [];

  for (const part of unnestedObjPathParts) {
    if (typeof part === "string" && arrayIndexNums.length > 0) {
      filePathParts.push([...arrayIndexNums, part].join("."));
      arrayIndexNums = [];
      continue;
    }

    if (typeof part === "string") {
      filePathParts.push(part);
      continue;
    }

    if (typeof part === "number") {
      arrayIndexNums.push(part + 1);
      continue;
    }
  }

  if (arrayIndexNums.length > 0) {
    filePathParts.push(arrayIndexNums.join("."));
  }

  // 3. Format the final file path out based on the file path parts. Nest it
  // under the directories if the option is given.
  const fileName = filePathParts.pop();
  const paths = [...nestIntoDirs, ...filePathParts, `${fileName}.${fileExt}`];

  return path.join(...paths).toLowerCase();
};

/*
 * Traverse a given node and compile extraction settings of every extractable
 * field in the node into a sorted map.
 *
 * For example:
 *
 * Map(5) {
 *   [ 'template', 'visual_blocks', 0, 'content' ] => { default: true, file_ext: 'md' },
 *   [ 'template', 'settings', 'pre_content' ] => { default: true, file_ext: 'txt' },
 *   [ 'channel_overrides', 'json_overrides' ] => { default: true, file_ext: 'json' },
 *   [ 'template', 'subject' ] => { default: false, file_ext: 'txt' },
 *   [ 'template', 'visual_blocks' ] => { default: true, file_ext: 'json' }
 * }
 *
 * Note the compiled extraction settings are ordered from leaf to root.
 */
type CompiledExtractionSettings = Map<ObjKeyOrArrayIdx[], ExtractionSettings>;

const NON_RECURSIVELY_TRAVERSABLE_FIELDS_FOR_EXTRACTION = new Set(["branches"]);

const compileExtractionSettings = (
  node: unknown,
  objPathParts: ObjKeyOrArrayIdx[] = [],
): CompiledExtractionSettings => {
  const map: CompiledExtractionSettings = new Map();

  const compileRecursively = (item: any, parts: ObjKeyOrArrayIdx[]): any => {
    if (isPlainObject(item)) {
      const extractableFields = get(
        item,
        ["__annotation", "extractable_fields"],
        {},
      );

      for (const [key, val] of Object.entries(item)) {
        // If the field we are on is extractable, then add its extraction
        // settings to the map with the current object path.
        if (key in extractableFields) {
          map.set([...parts, key], extractableFields[key]);
        }

        // Recursively exam current field for any additionally extractable data
        // within, except for disallowed fields
        if (!NON_RECURSIVELY_TRAVERSABLE_FIELDS_FOR_EXTRACTION.has(key)) {
          compileRecursively(val, [...parts, key]);
        }
      }

      return;
    }

    if (Array.isArray(item)) {
      item.map((val, idx) => compileRecursively(val, [...parts, idx]));
    }
  };

  // Walk the node tree and compile all extractable fields by object path.
  compileRecursively(node, objPathParts);

  // Sort the compiled entries in desc order by the object path length, so the
  // deepest nested fields come first and the top most fields come last because
  // this is the order we should be extracting and replacing field contents.
  return new Map(
    [...map].sort((a, b) => {
      const aLength = a[0].length;
      const bLength = b[0].length;

      if (aLength < bLength) return 1;
      if (aLength > bLength) return -1;
      return 0;
    }),
  );
};

const keyLocalWorkflowStepsByRef = (
  steps: unknown,
  result: AnyObj = {},
): AnyObj => {
  if (!Array.isArray(steps)) return result;

  for (const step of steps) {
    if (!isPlainObject(step)) continue;
    if (!step.ref) continue;

    result[step.ref] = step;

    if (step.type === StepType.Branch && Array.isArray(step.branches)) {
      for (const branch of step.branches) {
        if (!isPlainObject(branch)) continue;

        result = keyLocalWorkflowStepsByRef(branch.steps as AnyObj[], result);
      }
    }
  }

  return result;
};

const recursivelyBuildWorkflowDirBundle = (
  bundle: WorkflowDirBundle,
  steps: WorkflowStepData<WithAnnotation>[],
  localWorkflowStepsByRef: AnyObj,
): void => {
  for (const step of steps) {
    // A compiled map of extraction settings of every field in the step where
    // we support content extraction, organized by each field's object path.
    const compiledExtractionSettings = compileExtractionSettings(step);

    // Iterate through each extractable field, determine whether we need to
    // extract the field content in the remote workflow, and if so, perform the
    // extraction. Note, this compiled map is ordered by the deepest nested to
    // the top most fields, so that more than one extraction is possible.
    for (const [
      objPathParts,
      extractionSettings,
    ] of compiledExtractionSettings) {
      // If this step doesn't have this object path, then it's not relevant so
      // nothing more to do here.
      if (!has(step, objPathParts)) continue;

      // If the field at this path is extracted in the local workflow, then
      // always extract; otherwise extract based on the field settings default.
      const objPathStr = ObjPath.stringify(objPathParts);

      const extractedFilePath = get(
        localWorkflowStepsByRef,
        `${step.ref}.${objPathStr}${FILEPATH_MARKER}`,
      );

      const { default: extractByDefault, file_ext: fileExt } =
        extractionSettings;

      if (!extractedFilePath && !extractByDefault) continue;

      // By this point, we have a field where we need to extract its content.

      // First figure out the relative file path (within the workflow directory)
      // for the extracted file. If already extracted in the local workflow,
      // then use that; otherwise format a new file path.
      const relpath =
        typeof extractedFilePath === "string"
          ? extractedFilePath
          : formatExtractedFilePath(objPathParts, fileExt, {
              unnestDirsBy: 1,
              nestIntoDirs: [step.ref],
            });

      // In case we are about to extract a field that has children rather than
      // string content (e.g. visual blocks), prepare the data to strip out any
      // annotations.
      let data = omitDeep(get(step, objPathParts), ["__annotation"]);

      // Also, if the extractable data contains extracted file paths in itself
      // then rebase those file paths to be relative to its referenced file.
      data = mapValuesDeep(data, (value, key) => {
        if (!FILEPATH_MARKED_RE.test(key)) return value;

        const rebaseRootDir = path.dirname(relpath);
        const rebasedFilePath = path.relative(rebaseRootDir, value);

        return rebasedFilePath;
      });

      const content =
        typeof data === "string" ? data : JSON.stringify(data, null, 2);

      // Perform the extraction by adding the content and its file path to the
      // bundle for writing to the file system later. Then replace the field
      // content with the extracted file path and mark the field as extracted
      // with @ suffix.
      //
      // TODO: Consider guarding against an edge case, and check if the relpath
      // already exists in the bundle, and if so make the relpath unique.
      set(bundle, [relpath], content);
      set(step, `${objPathStr}${FILEPATH_MARKER}`, relpath);
      unset(step, objPathParts);
    }

    // Lastly, recurse thru any branches that exist in the workflow tree
    if (step.type === StepType.Branch) {
      for (const branch of step.branches) {
        recursivelyBuildWorkflowDirBundle(
          bundle,
          branch.steps,
          localWorkflowStepsByRef,
        );
      }
    }
  }
};

/*
 * For a given workflow payload (and its local workflow reference), this function
 * builds a "workflow directory bundle", which is an obj made up of all the
 * relative file paths (within the workflow directory) and its file content to
 * write the workflow directory.
 *
 * Every workflow will always have a workflow.json file, so every bundle includes
 * it and its content at minimum. To the extent the workflow includes any
 * extractable fields, those fields content get extracted out and added to the
 * bundle.
 *
 * Important things to keep in mind re: content extraction:
 * 1. There can be multiple places in workflow json where content extraction
 *    happens.
 * 2. There can be multiple levels of content extraction happening, currently
 *    at a maximum of 2 levels.
 *
 * The way this function works and handles the content extraction is by:
 * 1. Traversing the given step node, and compiling all annotated extraction
 *    settings by the object path in the node *ordered from leaf to root*.
 * 2. Iterate over compiled extraction settings from leaf to root, and start
 *    extracting out the field as needed. In case the node that needs to be
 *    extracted out contains extracted file paths, then those file paths get
 *    rebased to relative to the referenced file.
 */
const buildWorkflowDirBundle = (
  remoteWorkflow: WorkflowData<WithAnnotation>,
  localWorkflow: AnyObj = {},
): WorkflowDirBundle => {
  const bundle: WorkflowDirBundle = {};
  const mutWorkflow = cloneDeep(remoteWorkflow);
  const localWorkflowStepsByRef = keyLocalWorkflowStepsByRef(
    localWorkflow.steps,
  );

  // Recursively traverse the workflow step tree, mutating it and the bundle
  // along the way
  recursivelyBuildWorkflowDirBundle(
    bundle,
    mutWorkflow.steps,
    localWorkflowStepsByRef,
  );

  // Then, prepare the workflow data to be written into a workflow json file.
  return set(bundle, [WORKFLOW_JSON], toWorkflowJson(mutWorkflow));
};

/*
 * The main write function that takes the fetched workflow data from Knock API
 * (remote workflow), and reads the same workflow from the local file system
 * (local workflow, if available), then writes the remote workflow into a
 * workflow directory with the local workflow as a reference.
 */
export const writeWorkflowDirFromData = async (
  workflowDirCtx: WorkflowDirContext,
  remoteWorkflow: WorkflowData<WithAnnotation>,
): Promise<void> => {
  // If the workflow directory exists on the file system (i.e. previously
  // pulled before), then read the workflow file to use as a reference.
  const [localWorkflow] = workflowDirCtx.exists
    ? await readWorkflowDir(workflowDirCtx, { withExtractedFiles: true })
    : [];

  const bundle = buildWorkflowDirBundle(remoteWorkflow, localWorkflow);

  return writeWorkflowDirFromBundle(workflowDirCtx, bundle);
};

/*
 * A lower level write function that takes a constructed workflow dir bundle
 * and writes it into a workflow directory on a local file system.
 *
 * It does not make any assumptions about how the workflow directory bundle was
 * built; for example, it can be from parsing the workflow data fetched from
 * the Knock API, or built manually for scaffolding purposes.
 */
export const writeWorkflowDirFromBundle = async (
  workflowDirCtx: WorkflowDirContext,
  workflowDirBundle: WorkflowDirBundle,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (workflowDirCtx.exists) {
      await fs.copy(workflowDirCtx.abspath, backupDirPath);
      await fs.emptyDir(workflowDirCtx.abspath);
    }

    const promises = Object.entries(workflowDirBundle).map(
      ([relpath, fileContent]) => {
        const filePath = path.resolve(workflowDirCtx.abspath, relpath);

        return relpath === WORKFLOW_JSON
          ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
          : fs.outputFile(filePath, fileContent);
      },
    );
    await Promise.all(promises);
  } catch (error) {
    // In case of any error, wipe the target directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (workflowDirCtx.exists) {
      await fs.emptyDir(workflowDirCtx.abspath);
      await fs.copy(backupDirPath, workflowDirCtx.abspath);
    } else {
      await fs.remove(workflowDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

/*
 * Prunes the index directory by removing any files, or directories that aren't
 * workflow dirs found in fetched workflows. We want to preserve any workflow
 * dirs that are going to be updated with remote workflows, so extracted links
 * can be respected.
 */
const pruneWorkflowsIndexDir = async (
  indexDirCtx: DirContext,
  remoteWorkflows: WorkflowData<WithAnnotation>[],
): Promise<void> => {
  const workflowsByKey = Object.fromEntries(
    remoteWorkflows.map((w) => [w.key.toLowerCase(), w]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });

  const promises = dirents.map(async (dirent) => {
    const direntName = dirent.name.toLowerCase();
    const direntPath = path.resolve(indexDirCtx.abspath, direntName);

    if ((await isWorkflowDir(direntPath)) && workflowsByKey[direntName]) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

/*
 * The bulk write function that takes the fetched workflows data from Knock API
 * (remote workflows), and writes them into a workflows "index" directory by
 * referencing locally available workflows.
 */
export const writeWorkflowsIndexDir = async (
  indexDirCtx: DirContext,
  remoteWorkflows: WorkflowData<WithAnnotation>[],
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    // If the index directory already exists, back it up in the temp sandbox
    // before wiping it clean.
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await pruneWorkflowsIndexDir(indexDirCtx, remoteWorkflows);
    }

    // Write given remote workflows into the given workflows directory path.
    const writeWorkflowDirPromises = remoteWorkflows.map(async (workflow) => {
      const workflowDirPath = path.resolve(indexDirCtx.abspath, workflow.key);

      const workflowDirCtx: WorkflowDirContext = {
        type: "workflow",
        key: workflow.key,
        abspath: workflowDirPath,
        exists: indexDirCtx.exists
          ? await isWorkflowDir(workflowDirPath)
          : false,
      };

      return writeWorkflowDirFromData(workflowDirCtx, workflow);
    });

    await Promise.all(writeWorkflowDirPromises);
  } catch (error) {
    // In case of any error, wipe the index directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (indexDirCtx.exists) {
      await fs.emptyDir(indexDirCtx.abspath);
      await fs.copy(backupDirPath, indexDirCtx.abspath);
    } else {
      await fs.remove(indexDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

// Exported for tests.
export {
  buildWorkflowDirBundle,
  formatExtractedFilePath,
  pruneWorkflowsIndexDir,
  toWorkflowJson,
};
