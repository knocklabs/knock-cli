import * as path from "node:path";

import * as fs from "fs-extra";

import { formatErrors, JsonDataError } from "@/lib/helpers/error";
import { ParsedJson, parseJson } from "@/lib/helpers/json";
import { validateLiquidSyntax } from "@/lib/helpers/liquid";
import { VISUAL_BLOCKS_JSON } from "@/lib/marshal/workflow";
import { EmailLayoutDirContext, WorkflowDirContext } from "@/lib/run-context";

// Mark any template fields we are extracting out with this suffix as a rule,
// so we can reliably interpret the field value.
export const FILEPATH_MARKER = "@";
export const FILEPATH_MARKED_RE = new RegExp(`${FILEPATH_MARKER}$`);

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
  dirCtx: WorkflowDirContext | EmailLayoutDirContext,
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
