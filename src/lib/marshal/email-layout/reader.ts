import path from "node:path";

import * as fs from "fs-extra";
import { mapValues, set, unset } from "lodash";

import { JsonDataError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import { AnyObj, omitDeep } from "@/lib/helpers/object";
import {
  checkIfValidExtractedFilePathFormat,
  FILEPATH_MARKED_RE,
  readExtractedFileSync,
} from "@/lib/marshal/shared/helpers";
import { EmailLayoutDirContext } from "@/lib/run-context";

import { LAYOUT_JSON, lsEmailLayoutJson } from "./helpers";

type JoinExtractedFilesResult = [AnyObj, JsonDataError[]];

type ReadLayoutDirOpts = {
  withExtractedFiles?: boolean;
  withReadonlyField?: boolean;
};

/*
 * The main read function that takes the layout directory context, then reads
 * the layout json from the file system and returns the layout data obj.
 */
export const readEmailLayoutDir = async (
  layoutDirCtx: EmailLayoutDirContext,
  opts: ReadLayoutDirOpts = {},
): Promise<ParseJsonResult | JoinExtractedFilesResult> => {
  const { abspath } = layoutDirCtx;
  const { withExtractedFiles = false, withReadonlyField = false } = opts;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const layoutJsonPath = await lsEmailLayoutJson(abspath);

  if (!layoutJsonPath) throw new Error(`${abspath} is not a layout directory`);

  const result = await readJson(layoutJsonPath);
  if (!result[0]) return result;

  let [layoutJson] = result;

  layoutJson = withReadonlyField
    ? layoutJson
    : omitDeep(layoutJson, ["__readonly"]);

  return withExtractedFiles
    ? joinExtractedFiles(layoutDirCtx, layoutJson)
    : [layoutJson, []];
};

/*
 * Given a layout json object, compiles all referenced extracted files from it
 * and returns the updated object with the extracted content joined and inlined.
 */
const joinExtractedFiles = async (
  layoutDirCtx: EmailLayoutDirContext,
  layoutJson: AnyObj,
): Promise<JoinExtractedFilesResult> => {
  const errors: JsonDataError[] = [];

  mapValues(layoutJson, (relpath: string, key: string) => {
    // If not marked with the @suffix, there's nothing to do.
    if (!FILEPATH_MARKED_RE.test(key)) return;

    const objPathStr = key.replace(FILEPATH_MARKED_RE, "");

    // Check if the extracted path found at the current field path is valid
    const invalidFilePathError = validateExtractedFilePath(
      relpath,
      layoutDirCtx,
    );
    if (invalidFilePathError) {
      errors.push(invalidFilePathError);
      // Wipe the invalid file path in the node so the final layout json
      // object ends up with only valid file paths, this way layout writer
      // can see only valid file paths and use those when pulling.
      set(layoutJson, key, undefined);

      return;
    }

    // By this point we have a valid extracted file path, so attempt to read the file
    const [content, readExtractedFileError] = readExtractedFileSync(
      relpath,
      layoutDirCtx,
      key,
    );

    if (readExtractedFileError) {
      errors.push(readExtractedFileError);

      return;
    }

    // Inline the file content and remove the extracted file path
    set(layoutJson, objPathStr, content);
    unset(layoutJson, key);
  });

  return [layoutJson, errors];
};

/*
 * Validate the extracted file path based on its format and uniqueness (but not
 * the presence).
 *
 * Note, the uniqueness check is based on reading from and writing to
 * uniqueFilePaths, which is MUTATED in place.
 */
const validateExtractedFilePath = (
  val: unknown,
  emailLayoutDirCtx: EmailLayoutDirContext,
): JsonDataError | undefined => {
  const layoutJsonPath = path.resolve(emailLayoutDirCtx.abspath, LAYOUT_JSON);
  // Validate the file path format, and that it is unique per workflow.
  if (
    !checkIfValidExtractedFilePathFormat(val, layoutJsonPath) ||
    typeof val !== "string"
  ) {
    const error = new JsonDataError(
      "must be a relative path string to a unique file within the directory",
      String(val),
    );

    return error;
  }

  return undefined;
};
