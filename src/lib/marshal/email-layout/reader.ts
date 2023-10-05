import path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";
import { hasIn, set } from "lodash";

import { formatErrors, JsonDataError, SourceError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import { AnyObj, mapValuesDeep, ObjPath, omitDeep } from "@/lib/helpers/object";
import {
  FILEPATH_MARKED_RE,
  readExtractedFileSync,
  validateExtractedFilePath,
} from "@/lib/marshal/shared/helpers";
import { EmailLayoutDirContext } from "@/lib/run-context";

import {
  isEmailLayoutDir,
  LAYOUT_JSON,
  EmailLayoutCommandTarget,
  lsEmailLayoutJson,
} from "./helpers";

type JoinExtractedFilesResult = [AnyObj, JsonDataError[]];

// Hydrated layout directory context with its content.
export type EmailLayoutDirData = EmailLayoutDirContext & {
  content: AnyObj;
};

type ReadLayoutDirOpts = {
  withExtractedFiles?: boolean;
  withReadonlyField?: boolean;
};

/*

 * List and read all layout directories found for the given command target.
 *
 * Note, it assumes the valid command target.
 */
export const readAllForCommandTarget = async (
  target: EmailLayoutCommandTarget,
  opts: ReadLayoutDirOpts = {},
): Promise<[EmailLayoutDirData[], SourceError[]]> => {
  const { type: targetType, context: targetCtx } = target;

  if (!targetCtx.exists) {
    const subject =
      targetType === "emailLayoutDir"
        ? "a layout directory at"
        : "layout directories in";

    return ux.error(`Cannot locate ${subject} \`${targetCtx.abspath}\``);
  }

  switch (targetType) {
    case "emailLayoutDir": {
      return readEmailLayoutsDirs([targetCtx], opts);
    }

    case "emailLayoutsIndexDir": {
      const dirents = await fs.readdir(targetCtx.abspath, {
        withFileTypes: true,
      });

      const promises = dirents.map(async (dirent) => {
        const abspath = path.resolve(targetCtx.abspath, dirent.name);
        const layoutDirCtx: EmailLayoutDirContext = {
          type: "email_layout",
          key: dirent.name,
          abspath,
          exists: await isEmailLayoutDir(abspath),
        };
        return layoutDirCtx;
      });

      const layoutDirCtxs = (await Promise.all(promises)).filter(
        (layoutDirCtx) => layoutDirCtx.exists,
      );

      return readEmailLayoutsDirs(layoutDirCtxs, opts);
    }

    default:
      throw new Error(`Invalid layout command target: ${target}`);
  }
};

/*
 * For the given list of layout directory contexts, read each layout dir and
 * return layout directory data.
 */
const readEmailLayoutsDirs = async (
  layoutDirCtxs: EmailLayoutDirContext[],
  opts: ReadLayoutDirOpts = {},
): Promise<[EmailLayoutDirData[], SourceError[]]> => {
  const layouts: EmailLayoutDirData[] = [];
  const errors: SourceError[] = [];

  for (const layoutDirCtx of layoutDirCtxs) {
    // eslint-disable-next-line no-await-in-loop
    const [layout, readErrors] = await readEmailLayoutDir(layoutDirCtx, opts);

    if (readErrors.length > 0) {
      const layoutJsonPath = path.resolve(layoutDirCtx.abspath, LAYOUT_JSON);

      const e = new SourceError(formatErrors(readErrors), layoutJsonPath);
      errors.push(e);
      continue;
    }

    layouts.push({ ...layoutDirCtx, content: layout! });
  }

  return [layouts, errors];
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
      path.resolve(layoutDirCtx.abspath, LAYOUT_JSON),
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
