import path from "node:path";

import * as fs from "fs-extra";
import { hasIn, set } from "lodash";

import { JsonDataError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import {
  AnyObj,
  mapValuesDeep,
  ObjPath,
  omitDeep,
} from "@/lib/helpers/object.isomorphic";
import {
  readExtractedFileSync,
  validateExtractedFilePath,
} from "@/lib/marshal/shared/helpers";
import { PartialDirContext } from "@/lib/run-context";

import { FILEPATH_MARKED_RE } from "../shared/const.isomorphic";
import { lsPartialJson } from "./helpers";
import { PARTIAL_JSON } from "./processor.isomorphic";

/*
 * The main read function that takes the partial directory context, then reads
 * the partial json from the file system and returns the partial data obj.
 */
type ReadPartialDirOpts = {
  withExtractedFiles?: boolean;
  withReadonlyField?: boolean;
};

export const readPartialDir = async (
  partialDirCtx: PartialDirContext,
  opts: ReadPartialDirOpts = {},
): Promise<ParseJsonResult | JoinExtractedFilesResult> => {
  const { abspath } = partialDirCtx;
  const { withExtractedFiles = false, withReadonlyField = false } = opts;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const partialJsonPath = await lsPartialJson(abspath);
  if (!partialJsonPath)
    throw new Error(`${abspath} is not a partial directory`);

  const result = await readJson(partialJsonPath);
  if (!result[0]) return result;

  let [partialJson] = result;

  partialJson = withReadonlyField
    ? partialJson
    : omitDeep(partialJson, ["__readonly"]);

  return withExtractedFiles
    ? joinExtractedFiles(partialDirCtx, partialJson)
    : [partialJson, []];
};

type JoinExtractedFilesResult = [AnyObj, JsonDataError[]];

const joinExtractedFiles = async (
  partialDirCtx: PartialDirContext,
  partialJson: AnyObj,
): Promise<JoinExtractedFilesResult> => {
  // Tracks any errors encountered during traversal. Mutated in place.
  const errors: JsonDataError[] = [];

  // Tracks each new valid extracted file path seen (rebased to be relative to
  // partial.json) in the partial json node. Mutated in place, and used
  // to validate the uniqueness of an extracted path encountered.
  const uniqueFilePaths = {};

  mapValuesDeep(partialJson, (relpath: string, key: string, parts) => {
    // If not marked with the @suffix, there's nothing to do.
    if (!FILEPATH_MARKED_RE.test(key)) return;

    const objPathToFieldStr = ObjPath.stringify(parts);
    const inlinObjPathStr = objPathToFieldStr.replace(FILEPATH_MARKED_RE, "");

    // If there is inlined content present already, then nothing more to do.
    if (hasIn(partialJson, inlinObjPathStr)) return;

    // Check if the extracted path found at the current field path is valid
    const invalidFilePathError = validateExtractedFilePath(
      relpath,
      path.resolve(partialDirCtx.abspath, PARTIAL_JSON),
      uniqueFilePaths,
      objPathToFieldStr,
    );
    if (invalidFilePathError) {
      errors.push(invalidFilePathError);
      // Wipe the invalid file path in the node so the final partial json
      // object ends up with only valid file paths, this way partial writer
      // can see only valid file paths and use those when pulling.
      set(partialJson, inlinObjPathStr, undefined);
      set(partialJson, objPathToFieldStr, undefined);
      return;
    }

    // By this point we have a valid extracted file path, so attempt to read the file.
    const [content, readExtractedFileError] = readExtractedFileSync(
      relpath,
      partialDirCtx,
      key,
    );

    if (readExtractedFileError) {
      errors.push(readExtractedFileError);

      // If there's an error, replace the extracted file path with the original one, and set the
      // inlined field path in partial object with empty content, so we know
      // we do not need to try inlining again.
      set(partialJson, objPathToFieldStr, relpath);
      set(partialJson, inlinObjPathStr, undefined);
      return;
    }

    // Inline the file content and remove the extracted file path.
    set(partialJson, objPathToFieldStr, relpath);
    set(partialJson, inlinObjPathStr, content);
  });

  return [partialJson, errors];
};
