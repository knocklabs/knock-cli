import * as fs from "fs-extra";
import { hasIn, set } from "lodash";

import { JsonDataError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import { AnyObj, mapValuesDeep, ObjPath, omitDeep } from "@/lib/helpers/object";
import {
  FILEPATH_MARKED_RE,
  readExtractedFileSync,
  validateExtractedFilePath,
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
  // Tracks any errors encountered during traversal. Mutated in place.
  const errors: JsonDataError[] = [];

  // Tracks each new valid extracted file path seen (rebased to be relative to
  // layout.json) in the layout json node. Mutated in place, and used
  // to validate the uniqueness of an extracted path encountered.
  const uniqueFilePaths = {};

  mapValuesDeep(layoutJson, (relpath: string, key: string, parts) => {
    // If not marked with the @suffix, there's nothing to do.
    if (!FILEPATH_MARKED_RE.test(key)) return;

    const objPathToFieldStr = ObjPath.stringify(parts);
    const inlinObjPathStr = objPathToFieldStr.replace(FILEPATH_MARKED_RE, "");

    // If there is inlined content present already, then nothing more to do.
    if (hasIn(layoutJson, inlinObjPathStr)) return;

    // Check if the extracted path found at the current field path is valid
    const invalidFilePathError = validateExtractedFilePath(
      relpath,
      layoutDirCtx.abspath,
      LAYOUT_JSON,
      uniqueFilePaths,
      objPathToFieldStr,
    );
    if (invalidFilePathError) {
      errors.push(invalidFilePathError);
      // Wipe the invalid file path in the node so the final layout json
      // object ends up with only valid file paths, this way layout writer
      // can see only valid file paths and use those when pulling.
      set(layoutJson, inlinObjPathStr, undefined);
      set(layoutJson, objPathToFieldStr, undefined);
      return;
    }

    // By this point we have a valid extracted file path, so attempt to read the file.
    const [content, readExtractedFileError] = readExtractedFileSync(
      relpath,
      layoutDirCtx,
      key,
    );

    if (readExtractedFileError) {
      errors.push(readExtractedFileError);

      // If there's an error, replace the extracted file path with the original one, and set the
      // inlined field path in layout object with empty content, so we know
      // we do not need to try inlining again.
      set(layoutJson, objPathToFieldStr, relpath);
      set(layoutJson, inlinObjPathStr, undefined);
      return;
    }

    // Inline the file content and remove the extracted file path.
    set(layoutJson, objPathToFieldStr, relpath);
    set(layoutJson, inlinObjPathStr, content);
  });

  return [layoutJson, errors];
};
