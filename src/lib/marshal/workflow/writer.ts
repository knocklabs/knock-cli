import * as path from "node:path";

import * as fs from "fs-extra";
import {
  cloneDeep,
  isPlainObject,
  get,
  has,
  keyBy,
  set,
  uniqueId,
  unset,
} from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import {
  AnyObj,
  omitDeep,
  split,
  mapValuesDeep,
  ObjKeyOrArrayIdx,
  ObjPath,
} from "@/lib/helpers/object";
import { ExtractionSettings, WithAnnotation } from "@/lib/marshal/shared/types";
import { WorkflowDirContext } from "@/lib/run-context";

import {
  FILEPATH_MARKED_RE,
  FILEPATH_MARKER,
  isWorkflowDir,
  WORKFLOW_JSON,
} from "./helpers";
import { readWorkflowDir, validateExtractedFilePathFormat } from "./reader";
import { WorkflowData } from "./types";

export type WorkflowDirBundle = {
  [relpath: string]: string;
};

/*
 * For a given workflow step and a template field, return the template file path
 * we can extract out the content to.
 *
 * Note, this is a default "recommended" convention but the template file can
 * be located at any arbitrary path (as long as it is a relative path that is
 * inside the workflow directory and unique to the field)
 */
// XXX:
export const newTemplateFilePath = (
  stepRef: string,
  fileName: string,
  fileExt: string,
): string => path.join(stepRef, `${fileName}.${fileExt}`).toLowerCase();

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
 * Compile and return extractable fields settings from the template and its
 * template settings if present.
 *
 * For example, for a channel step like this:
 *   {
 *     ref: "email_1",
 *     type: "channel",
 *     channel_key: "email-provider",
 *     template: {
 *       settings: {
 *         layout_key: "default",
 *         __annotation: {
 *           extractable_fields: {
 *             pre_content: { default: true, file_ext: "txt" },
 *           },
 *           readonly_fields: [],
 *         },
 *       },
 *       subject: "New activity",
 *       html_body: "<p>Hi <strong>{{ recipient.name }}</strong>.</p>",
 *       __annotation: {
 *         extractable_fields: {
 *           subject: { default: false, file_ext: "txt" },
 *           json_body: { default: true, file_ext: "json" },
 *           html_body: { default: true, file_ext: "html" },
 *           text_body: { default: true, file_ext: "txt" },
 *         },
 *         readonly_fields: [],
 *       },
 *     },
 *   }
 *
 * Takes the template data and returns a merged map of extractable fields like
 * this:
 *
 *   {
 *     subject: { default: false, file_ext: "txt" },
 *     json_body: { default: true, file_ext: "json" },
 *     html_body: { default: true, file_ext: "html" },
 *     text_body: { default: true, file_ext: "txt" },
 *     settings.pre_content: { default: true, file_ext: "txt" },
 *   }
 */

/*
 * XXX:
 */
type FormatExtractedFilePathOpts = {
  unnestDirsBy?: number;
  nestIntoDirs?: string[];
};

const formatExtractedFilePath = (
  objPathParts: ObjKeyOrArrayIdx[],
  fileExt: string,
  opts: FormatExtractedFilePathOpts = {},
) => {
  const { unnestDirsBy = 0, nestIntoDirs = [] } = opts;

  // 1.
  const maxUnnestableDepth = Math.min(
    Math.max(objPathParts.length - 1, 0),
    unnestDirsBy,
  );
  const unnestedObjPathParts = objPathParts.slice(
    maxUnnestableDepth,
    objPathParts.length,
  );

  // 2.
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

  // 3.
  const fileName = filePathParts.pop();
  const paths = [...nestIntoDirs, ...filePathParts, `${fileName}.${fileExt}`];

  return path.join(...paths).toLowerCase();
};

/*
 * Traverse a given node and compile extraction settings of every extractable
 * field in the node into a map.
 */
type CompiledExtractionSettings = Map<ObjKeyOrArrayIdx[], ExtractionSettings>;

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

      Object.entries(item).map(([key, val]) => {
        // If the field we are on is extractable, then add its extraction
        // settings to the map with the current object path.
        if (key in extractableFields) {
          map.set([...parts, key], extractableFields[key]);
        }

        compileRecursively(val, [...parts, key]);
      });
      return;
    }

    if (Array.isArray(item)) {
      item.map((val, idx) => compileRecursively(val, [...parts, idx]));
      return;
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

/*
 * Parse a given workflow payload, and extract out any extractable contents
 * where necessary and mutate the workflow data accordingly so we end up with a
 * mapping of file contents by its relative path (aka workflow dir bundle) that
 * can be written into a file system as individual files.
 */
const buildWorkflowDirBundle = (
  workflowDirCtx: WorkflowDirContext,
  remoteWorkflow: WorkflowData<WithAnnotation>,
  localWorkflow: AnyObj = {},
): WorkflowDirBundle => {
  const bundle: WorkflowDirBundle = {};
  const mutWorkflow = cloneDeep(remoteWorkflow);

  const localWorkflowStepsByRef = keyBy(localWorkflow.steps || [], "ref");

  for (const step of mutWorkflow.steps) {
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
      // 1. If the step doesn't have this object path, then it's not relevant
      // so nothing more to do here.
      if (!has(step, objPathParts)) continue;

      // 2. If the field at this path is extracted in the local workflow, then
      // always extract; otherwise extract based on the field settings default.
      const objPathStr = ObjPath.stringify(objPathParts);
      const extractedFilePath = get(
        localWorkflowStepsByRef,
        `${step.ref}.${objPathStr}${FILEPATH_MARKER}`,
      );

      const isValidExtractedFilePath =
        Boolean(extractedFilePath) &&
        validateExtractedFilePathFormat(extractedFilePath, workflowDirCtx);

      const { default: extractByDefault, file_ext: fileExt } =
        extractionSettings;
      if (!isValidExtractedFilePath && !extractByDefault) continue;

      // 3. By this point, we have a field where we need to extract its content.

      // First figure out the relative file path (within the workflow directory)
      // for the extracted file. If already extracted in the local workflow,
      // then use that; otherwise format a new file path.
      const relpath =
        extractedFilePath ||
        formatExtractedFilePath(objPathParts, fileExt, {
          unnestDirsBy: 1,
          nestIntoDirs: [step.ref],
        });

      // In case we are about to extract a field has children rather than a
      // string content (e.g. visual blocks), prepare the data to strip out any
      // annotations and also rebase the extracted file paths in its children
      // to be relative to its referenced parent.
      let data = omitDeep(get(step, objPathParts), ["__annotation"]);

      data = mapValuesDeep(data, (value, key) => {
        if (!FILEPATH_MARKED_RE.test(key)) return value;

        const rebaseRootDir = path.dirname(relpath);
        const rebasedFilePath = path.relative(rebaseRootDir, value);

        return rebasedFilePath;
      });

      const content =
        typeof data === "string" ? data : JSON.stringify(data, null, 2);

      // Perform the extraction by adding the content and its file path to the
      // bundle for writing to the file system later, replacing the field content
      // in the remote workflow with the file path, and marking the field as
      // extracted with @ suffix.
      set(bundle, [relpath], content);
      set(step, `${objPathStr}${FILEPATH_MARKER}`, relpath);
      unset(step, objPathParts);
    }
  }

  // Finally, prepare the workflow data to be written into a workflow json file.
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
  // Note, we do not need to compile or validate template files for this.
  const [localWorkflow] = workflowDirCtx.exists
    ? await readWorkflowDir(workflowDirCtx, { withExtractedFiles: false })
    : [];

  const bundle = buildWorkflowDirBundle(
    workflowDirCtx,
    remoteWorkflow,
    localWorkflow,
  );

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
  try {
    // TODO(KNO-2794): Should rather clean up any orphaned template files
    // individually after successfully writing the workflow directory.
    await fs.remove(workflowDirCtx.abspath);

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
    await fs.remove(workflowDirCtx.abspath);
    throw error;
  }
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
      await fs.remove(indexDirCtx.abspath);
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
    await fs.remove(indexDirCtx.abspath);
    if (indexDirCtx.exists) {
      await fs.copy(backupDirPath, indexDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

// Exported for tests.
export { buildWorkflowDirBundle, toWorkflowJson };
