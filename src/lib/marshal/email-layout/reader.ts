import * as fs from "fs-extra";
import { mapValues, set, unset } from "lodash";

import { JsonDataError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import { AnyObj, omitDeep } from "@/lib/helpers/object";
import {
  FILEPATH_MARKED_RE,
  readExtractedFileSync,
} from "@/lib/marshal/shared/helpers";
import { EmailLayoutDirContext } from "@/lib/run-context";

import { lsEmailLayoutJson } from "./helpers";

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

    const objPathStr = key.replace(FILEPATH_MARKED_RE, "");
    // Inline the file content and remove the extracted file path
    set(layoutJson, objPathStr, content);
    unset(layoutJson, key);
  });

  return [layoutJson, errors];
};
