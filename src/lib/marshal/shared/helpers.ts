import * as path from "node:path";

import * as fs from "fs-extra";

import { formatErrors, JsonDataError } from "@/lib/helpers/error";
import { ParsedJson, parseJson } from "@/lib/helpers/json";
import { validateLiquidSyntax } from "@/lib/helpers/liquid";
import { VISUAL_BLOCKS_JSON } from "@/lib/marshal/workflow";
import {
  EmailLayoutDirContext,
  PartialDirContext,
  WorkflowDirContext,
} from "@/lib/run-context";

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

export const readExtractedFileSync = (
  relpath: string,
  dirCtx: WorkflowDirContext | EmailLayoutDirContext | PartialDirContext,
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
  const liquidParseError = validateLiquidSyntax(contentStr);

  if (liquidParseError) {
    const error = new JsonDataError(
      `points to a file that contains invalid liquid syntax (${relpath})\n\n` +
        formatErrors([liquidParseError], { indentBy: 2 }),
      objPathToFieldStr,
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
