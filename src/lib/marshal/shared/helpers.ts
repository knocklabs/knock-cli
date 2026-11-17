import * as path from "node:path";

import * as fs from "fs-extra";
import { hasIn, set } from "lodash";

import { formatErrors, JsonDataError } from "@/lib/helpers/error";
import { ParsedJson, parseJson } from "@/lib/helpers/json";
import { validateLiquidSyntax } from "@/lib/helpers/liquid";
import {
  AnyObj,
  getLastFound,
  mapValuesDeep,
  ObjPath,
} from "@/lib/helpers/object.isomorphic";
import { FILEPATH_MARKED_RE } from "@/lib/marshal/shared/const.isomorphic";
import { VISUAL_BLOCKS_JSON } from "@/lib/marshal/workflow";
import {
  BroadcastDirContext,
  EmailLayoutDirContext,
  GuideDirContext,
  MessageTypeDirContext,
  PartialDirContext,
  ReusableStepDirContext,
  WorkflowDirContext,
} from "@/lib/run-context";

type ExtractedFileDirContext =
  | BroadcastDirContext
  | WorkflowDirContext
  | EmailLayoutDirContext
  | PartialDirContext
  | MessageTypeDirContext
  | GuideDirContext
  | ReusableStepDirContext;

/*
 * Read the file at the given path if it exists, validate the content as
 * applicable, and return the content string or an error.
 */
type ExtractedFileContent = string | ParsedJson;
type ReadExtractedFileResult =
  | [undefined, JsonDataError]
  | [ExtractedFileContent, undefined];

// The following files are exepected to have valid json content, and should be
// decoded and joined into the main JSON file.
const DECODABLE_JSON_FILES = new Set([VISUAL_BLOCKS_JSON]);

const validateLiquidSyntaxDeep = (
  content: unknown,
): ReturnType<typeof validateLiquidSyntax> => {
  if (typeof content === "string") return validateLiquidSyntax(content);

  if (Array.isArray(content)) {
    for (const item of content) {
      const liquidParseError = validateLiquidSyntaxDeep(item);
      if (liquidParseError) return liquidParseError;
    }
  } else if (content && typeof content === "object") {
    for (const value of Object.values(content)) {
      const liquidParseError = validateLiquidSyntaxDeep(value);
      if (liquidParseError) return liquidParseError;
    }
  }

  return undefined;
};

export const readExtractedFileSync = (
  relpath: string,
  dirCtx: ExtractedFileDirContext,
  objPathToFieldStr = "",
): ReadExtractedFileResult => {
  // Check if the file actually exists at the given file path.
  const abspath = path.resolve(dirCtx.abspath, relpath);
  const exists = fs.pathExistsSync(abspath);
  if (!exists) {
    const error = new JsonDataError(
      "must be a relative path string to a file that exists",
      objPathToFieldStr,
    );
    return [undefined, error];
  }

  // Read the file and check for valid liquid syntax given it is supported
  // across all message templates and file extensions.
  const contentStr = fs.readFileSync(abspath, "utf8");
  const fileName = path.basename(abspath.toLowerCase());
  const decodable = DECODABLE_JSON_FILES.has(fileName);

  // If the file is expected to contain decodable json, parse the contentStr
  // first so Liquid inside JSON string values is validated after JSON unescapes
  // string delimiters (e.g. \"Doc\" -> "Doc").
  const [content, jsonParseErrors] = decodable
    ? parseJson(contentStr)
    : [contentStr, []];

  if (jsonParseErrors.length > 0) {
    const error = new JsonDataError(
      `points to a file with invalid content (${relpath})\n\n` +
        formatErrors(jsonParseErrors, { indentBy: 2 }),
      objPathToFieldStr,
    );

    return [undefined, error];
  }

  const liquidParseError = decodable
    ? validateLiquidSyntaxDeep(content)
    : validateLiquidSyntax(contentStr);

  if (liquidParseError) {
    const error = new JsonDataError(
      `points to a file that contains invalid liquid syntax (${relpath})\n\n` +
        formatErrors([liquidParseError], { indentBy: 2 }),
      objPathToFieldStr,
    );

    return [undefined, error];
  }

  return [content!, undefined];
};

/*
 * Validate the extracted file path based on its format and uniqueness (but not
 * the presence).
 *
 * Note, the uniqueness check is based on reading from and writing to
 * uniqueFilePaths, which is MUTATED in place.
 */
export const validateExtractedFilePath = (
  val: unknown,
  sourceFileAbspath: string,
  uniqueFilePaths: Record<string, boolean>,
  objPathToFieldStr: string,
): JsonDataError | undefined => {
  // Validate the file path format, and that it is unique per entity.
  if (
    !checkIfValidExtractedFilePathFormat(val, sourceFileAbspath) ||
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
 * Validate the file path format of an extracted field. The file path must be:
 *
 * 1) Expressed as a relative path.
 *
 *    For exmaple:
 *      subject@: "email_1/subject.html"              // GOOD
 *      subject@: "./email_1/subject.html"            // GOOD
 *      subject@: "/workflow-x/email_1/subject.html"  // BAD
 *
 * 2) The resolved path must be contained inside the directory
 *
 *    For exmaple (workflow-y is a different workflow dir in this example):
 *      subject@: "./email_1/subject.html"              // GOOD
 *      subject@: "../workflow-y/email_1/subject.html"  // BAD
 *
 * Note: does not validate the presence of the file nor the uniqueness of the
 * file path.
 */
export const checkIfValidExtractedFilePathFormat = (
  relpath: unknown,
  sourceFileAbspath: string,
): boolean => {
  if (typeof relpath !== "string") return false;

  if (path.isAbsolute(relpath)) return false;

  const extractedFileAbspath = path.resolve(sourceFileAbspath, relpath);
  const pathDiff = path.relative(sourceFileAbspath, extractedFileAbspath);

  return !pathDiff.startsWith("..");
};

// Resource files support up to two levels of content extraction
// (e.g. broadcast.json -> visual_blocks.json -> 1.content.md).
const MAX_EXTRACTION_LEVEL = 2;

/*
 * Given a resource json object (e.g. workflow.json or broadcast.json), compiles
 * all referenced extracted files from it and returns the updated object with
 * the extracted content joined and inlined.
 *
 * Important things to keep in mind:
 * 1. There can be multiple places in the resource json where content
 *    extraction happens.
 * 2. There can be multiple levels of content extraction happening, currently
 *    at a maximum of 2 levels. For example, workflow.json links to
 *    visual_blocks.json, and in return visual_blocks.json links to a markdown
 *    file for its block content. Any referenced extracted paths should be
 *    expressed *as a relative path to the file it is referenced in*.
 *
 * The way this function works and handles above two points, is by:
 * 1. Traversing the entire given resource json node from root to leaf and
 *    discovering extracted paths, without knowing about any specific fields
 *    extracted.
 * 2. Whenever it discovers an extracted path, it reads the linked file and
 *    inlines the content into the node. If the inlined content itself contains
 *    extracted paths, then it "rebase"s the file paths to be relative to the
 *    location of the root resource file (`rootFileName`).
 * 3. This traversal takes place for the maximum levels of content extraction
 *    supported (currently 2 levels).
 *
 * Note, this function MUTATES the given resource json obj.
 */
export type JoinExtractedFilesResult = [AnyObj, JsonDataError[]];
type JoinedFilePaths = Record<string, string>;

export const joinExtractedFiles = (
  dirCtx: ExtractedFileDirContext,
  resourceJson: AnyObj,
  rootFileName: string,
): JoinExtractedFilesResult => {
  // Tracks any errors encountered during traversal. Mutated in place.
  const errors: JsonDataError[] = [];

  // Tracks each new valid extracted file path seen (rebased to be relative to
  // the root resource file) in the resource json node. Mutated in place, and
  // used to validate the uniqueness of an extracted path encountered.
  const uniqueFilePaths: Record<string, boolean> = {};

  // Tracks each extracted file path (rebased) that gets inlined with its object
  // path location, per each traversal iteration. Mutated in place, and used for
  // rebasing an extracted path to be relative to the root resource file.
  const joinedFilePathsPerLevel: JoinedFilePaths[] = [];

  for (const [idx] of Array.from({ length: MAX_EXTRACTION_LEVEL }).entries()) {
    const currJoinedFilePaths: JoinedFilePaths = {};
    const prevJoinedFilePaths = joinedFilePathsPerLevel[idx - 1] || {};

    mapValuesDeep(resourceJson, (value, key, parts) => {
      // If not marked with the @ suffix, there's nothing to do.
      if (!FILEPATH_MARKED_RE.test(key)) return;

      const objPathToFieldStr = ObjPath.stringify(parts);
      const inlinObjPathStr = objPathToFieldStr.replace(FILEPATH_MARKED_RE, "");

      // If there is inlined content present already, then nothing more to do.
      if (hasIn(resourceJson, inlinObjPathStr)) return;

      // Check if the extracted path found at the current field path belongs to
      // a node whose parent or grandparent has been previously joined earlier
      // in the tree. If so, rebase the extracted path to be a relative path to
      // the root resource file.
      const lastFound = getLastFound(prevJoinedFilePaths, parts);
      const prevJoinedFilePath =
        typeof lastFound === "string" ? lastFound : undefined;

      const rebasedFilePath = prevJoinedFilePath
        ? path.join(path.dirname(prevJoinedFilePath), value)
        : value;

      const invalidFilePathError = validateExtractedFilePath(
        rebasedFilePath,
        path.resolve(dirCtx.abspath, rootFileName),
        uniqueFilePaths,
        objPathToFieldStr,
      );
      if (invalidFilePathError) {
        errors.push(invalidFilePathError);

        // Wipe the invalid file path in the node so the final resource json
        // object ends up with only valid file paths, this way the writer can
        // see only valid file paths and use those when pulling. Also set the
        // inlined field path with empty content so we know we've looked at
        // this extracted file path.
        set(resourceJson, objPathToFieldStr, undefined);
        set(resourceJson, inlinObjPathStr, undefined);
        return;
      }

      // By this point we have a valid extracted file path, so attempt to read
      // the file at the file path.
      const [content, readExtractedFileError] = readExtractedFileSync(
        rebasedFilePath,
        dirCtx,
        objPathToFieldStr,
      );
      if (readExtractedFileError) {
        errors.push(readExtractedFileError);

        // Replace the extracted file path with the rebased one, and set the
        // inlined field path with empty content, so we know we do not need to
        // try inlining again.
        set(resourceJson, objPathToFieldStr, rebasedFilePath);
        set(resourceJson, inlinObjPathStr, undefined);
        return;
      }

      // Inline the file content and replace the extracted file path with a
      // rebased one.
      set(resourceJson, objPathToFieldStr, rebasedFilePath);
      set(resourceJson, inlinObjPathStr, content);

      // Track joined file paths from the current join level.
      set(currJoinedFilePaths, inlinObjPathStr, rebasedFilePath);
    });

    // Finally save all the joined file paths from this traversal iteration.
    joinedFilePathsPerLevel[idx] = currJoinedFilePaths;
  }

  return [resourceJson, errors];
};
