import * as path from "node:path";

import * as fs from "fs-extra";
import { hasIn, set } from "lodash";

import { formatErrors, JsonDataError } from "@/lib/helpers/error";
import {
  ParsedJson,
  parseJson,
  ParseJsonResult,
  readJson,
} from "@/lib/helpers/json";
import { validateLiquidSyntax } from "@/lib/helpers/liquid";
import {
  AnyObj,
  getLastFound,
  mapValuesDeep,
  ObjPath,
  omitDeep,
} from "@/lib/helpers/object";
import { WorkflowDirContext } from "@/lib/run-context";

import {
  FILEPATH_MARKED_RE,
  lsWorkflowJson,
  VISUAL_BLOCKS_JSON,
  WORKFLOW_JSON,
} from "./helpers";

// For now we support up to two levels of content extraction in workflow.json.
// (e.g. workflow.json, then visual_blocks.json)
const MAX_EXTRACTION_LEVEL = 2;

// The following files are exepected to have valid json content, and should be
// decoded and joined into the main workflow.json.
const DECODABLE_JSON_FILES = new Set([VISUAL_BLOCKS_JSON]);

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
const checkIfValidExtractedFilePathFormat = (
  relpath: unknown,
  sourceFileAbspath: string,
): boolean => {
  if (typeof relpath !== "string") return false;
  if (path.isAbsolute(relpath)) return false;

  const extractedFileAbspath = path.resolve(sourceFileAbspath, relpath);
  const pathDiff = path.relative(sourceFileAbspath, extractedFileAbspath);

  return !pathDiff.startsWith("..");
};

// XXX: Make a note about it being stateful
const validateExtractedFilePath = (
  val: unknown,
  workflowDirCtx: WorkflowDirContext,
  extractedFilePaths: Record<string, boolean>,
  pathToFieldStr: string,
): JsonDataError | undefined => {
  const workflowJsonPath = path.resolve(workflowDirCtx.abspath, WORKFLOW_JSON);

  // Validate the file path format, and that it is unique per workflow.
  if (
    !checkIfValidExtractedFilePathFormat(val, workflowJsonPath) ||
    typeof val !== "string" ||
    val in extractedFilePaths
  ) {
    const error = new JsonDataError(
      "must be a relative path string to a unique file within the directory",
      pathToFieldStr,
    );

    return error;
  }

  // Keep track of all the valid extracted file paths that have been seen, so
  // we can validate each file path's uniqueness as we traverse.
  extractedFilePaths[val] = true;

  return undefined;
};

/*
 * Read a template file at the given path, validate the content as applicable,
 * return the content string or an error.
 */
type ExtractedFileContent = string | ParsedJson;
type ReadExtractedFileResult =
  | [undefined, JsonDataError]
  | [ExtractedFileContent, undefined];

/*
 * Validates that a given value is a valid template file path and the file
 * actually exists, before reading the file content.
 */
const readExtractedFileSync = (
  relpath: string,
  workflowDirCtx: WorkflowDirContext,
  pathToFieldStr: string,
): ReadExtractedFileResult => {
  // Check if a file actually exists at the given file path.
  const abspath = path.resolve(workflowDirCtx.abspath, relpath);
  const exists = fs.pathExistsSync(abspath);
  if (!exists) {
    const error = new JsonDataError(
      "must be a relative path string to a file that exists",
      pathToFieldStr,
    );
    return [undefined, error];
  }

  // Read the file and check for valid liquid syntax given it is supported
  // across all message templates and formats.
  const contentStr = fs.readFileSync(abspath, "utf8");
  const liquidParseError = validateLiquidSyntax(contentStr);

  if (liquidParseError) {
    const error = new JsonDataError(
      `points to a file that contains invalid liquid syntax (${relpath})\n\n` +
        formatErrors([liquidParseError], { indentBy: 2 }),
      pathToFieldStr,
    );

    return [undefined, error];
  }

  // If the file is expected to contain decodable json, then parse the contentStr
  // as such.
  const fileName = path.basename(abspath.toLowerCase());
  const decodable = DECODABLE_JSON_FILES.has(fileName);

  const [content, jsonParseErrors] = decodable
    ? parseJson(contentStr)
    : [contentStr, []];

  if (jsonParseErrors.length > 0) {
    const error = new JsonDataError(
      `points to a file with invalid content (${relpath})\n\n` +
        formatErrors(jsonParseErrors, { indentBy: 2 }),
      pathToFieldStr,
    );

    return [undefined, error];
  }

  return [content!, undefined];
};

/*
 * Given a workflow json object, compiles all referenced template files in it
 * and returns the updated object with templates content pulled in and inlined.
 *
 * In order for us to traverse the workflow object and gather template file
 * references (i.e. file paths to read), the given object must be structurally
 * "valid" to some degree. Given we cannot know that, we do minimum validations
 * necessary to reach templates in channel steps.
 *
 * Note, this function is meant to be a PRIVATE func and MUTATES the object.
 *
 * TODO: Include links to docs in the error message when ready.
 */
type JoinExtractedFilesResult = [AnyObj, JsonDataError[]];
type JoinedFilePaths = Record<string, string>;

const joinExtractedFiles = async (
  workflowDirCtx: WorkflowDirContext,
  workflowJson: AnyObj,
): Promise<JoinExtractedFilesResult> => {
  const errors: JsonDataError[] = [];
  const uniqueFilePaths = {};

  const joinedFilePathsPerLevel: JoinedFilePaths[] = [];

  for (const [idx] of Array.from({ length: MAX_EXTRACTION_LEVEL }).entries()) {
    const currJoinedFilePaths: JoinedFilePaths = {};
    const prevJoinedFilePaths = joinedFilePathsPerLevel[idx - 1] || {};

    mapValuesDeep(workflowJson, (value, key, parts) => {
      // If not marked with the @ suffix, there's nothing to do.
      if (!FILEPATH_MARKED_RE.test(key)) return;

      const pathToFieldStr = ObjPath.stringify(parts);
      const inlinePathStr = pathToFieldStr.replace(FILEPATH_MARKED_RE, "");

      // If there is inlined content present already, then nothing more to do.
      if (hasIn(workflowJson, inlinePathStr)) return;

      // Check if the extracted path found at the current field belongs to a
      // node whose parent or grandparent has has been previously joined earlier
      // in the tree. If so, rebase the extracted path to be a relative path to
      // the workflow directory.
      const lastFound = getLastFound(prevJoinedFilePaths, parts);
      const joinedFilePath =
        typeof lastFound === "string" ? lastFound : undefined;

      const normalizedFilePath = joinedFilePath
        ? path.join(path.dirname(joinedFilePath), value)
        : value;

      const invalidFilePathError = validateExtractedFilePath(
        normalizedFilePath,
        workflowDirCtx,
        uniqueFilePaths,
        pathToFieldStr,
      );
      if (invalidFilePathError) {
        errors.push(invalidFilePathError);

        // Wipe the invalid file path so the final workflow json object ends up
        // with only valid file paths, this way workflow writer can see only
        // valid file paths and use those when pulling. Also set the inlined
        // field path in workflow object with empty content so we know we've
        // looked at this extracted file path.
        set(workflowJson, pathToFieldStr, undefined);
        set(workflowJson, inlinePathStr, undefined);

        return;
      }

      // By this point we have a valid extracted file path, so attempt to read
      // the file at the file path.
      const [content, readExtractedFileError] = readExtractedFileSync(
        normalizedFilePath,
        workflowDirCtx,
        pathToFieldStr,
      );
      if (readExtractedFileError) {
        errors.push(readExtractedFileError);

        // Replace the extracted file path with the normalized one, and set the
        // inlined field path in workflow object with empty content, so we know
        // we do not need to try inlining again.
        set(workflowJson, pathToFieldStr, normalizedFilePath);
        set(workflowJson, inlinePathStr, undefined);

        return;
      }

      // Inline the file content and replace the extracted file path with a
      // normalized one.
      set(workflowJson, pathToFieldStr, normalizedFilePath);
      set(workflowJson, inlinePathStr, content);

      // Track all the joined file paths from the current join level.
      set(currJoinedFilePaths, inlinePathStr, normalizedFilePath);
    });

    // Finally add the current set of joined file paths XXX
    joinedFilePathsPerLevel[idx] = currJoinedFilePaths;
  }

  return [workflowJson, errors];
};

/*
 * The main read function that takes the path to a workflow directory, then
 * reads from the file system. Looks for the workflow json file as an entry
 * point and returns the workflow data obj.
 *
 * By default, it will look for any extracted template files referenced in the
 * workflow json and compile them into the workflow data.
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

// Exported for tests.
export { readExtractedFileSync };
