import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";
import { hasIn, set } from "lodash";

import { formatErrors, JsonDataError, SourceError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import {
  AnyObj,
  mapValuesDeep,
  ObjPath,
  omitDeep,
} from "@/lib/helpers/object.isomorphic";
import { FILEPATH_MARKED_RE } from "@/lib/marshal/shared/const.isomorphic";
import {
  readExtractedFileSync,
  validateExtractedFilePath,
} from "@/lib/marshal/shared/helpers";
import { GuideDirContext } from "@/lib/run-context";

import { GuideCommandTarget, isGuideDir, lsGuideJson } from "./helpers";
import { GUIDE_JSON } from "./processor.isomorphic";

// Hydrated guide directory context with its content.
export type GuideDirData = GuideDirContext & {
  content: AnyObj;
};

/*
 * For the given list of guide directory contexts, read each guide dir and
 * return guide directory data.
 */
const readGuideDirs = async (
  guideDirCtxs: GuideDirContext[],
  opts: ReadGuideDirOpts = {},
): Promise<[GuideDirData[], SourceError[]]> => {
  const guides: GuideDirData[] = [];
  const errors: SourceError[] = [];

  for (const guideDirCtx of guideDirCtxs) {
    // eslint-disable-next-line no-await-in-loop
    const [guide, readErrors] = await readGuideDir(guideDirCtx, opts);

    if (readErrors.length > 0) {
      const guideJsonPath = path.resolve(guideDirCtx.abspath, GUIDE_JSON);

      const e = new SourceError(formatErrors(readErrors), guideJsonPath);
      errors.push(e);
      continue;
    }

    guides.push({ ...guideDirCtx, content: guide! });
  }

  return [guides, errors];
};

/*
 * The main read function that takes the guide directory context, then reads
 * the guide json from the file system and returns the guide data obj.
 */
type ReadGuideDirOpts = {
  withExtractedFiles?: boolean;
};

export const readGuideDir = async (
  guideDirCtx: GuideDirContext,
  opts: ReadGuideDirOpts = {},
): Promise<ParseJsonResult | JoinExtractedFilesResult> => {
  const { abspath } = guideDirCtx;
  const { withExtractedFiles = false } = opts;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const guideJsonPath = await lsGuideJson(abspath);
  if (!guideJsonPath) throw new Error(`${abspath} is not a guide directory`);

  const result = await readJson(guideJsonPath);
  if (!result[0]) return result;

  let [guideJson] = result;

  guideJson = omitDeep(guideJson, ["__readonly"]);

  return withExtractedFiles
    ? joinExtractedFiles(guideDirCtx, guideJson)
    : [guideJson, []];
};

type JoinExtractedFilesResult = [AnyObj, JsonDataError[]];

const joinExtractedFiles = async (
  guideDirCtx: GuideDirContext,
  guideJson: AnyObj,
): Promise<JoinExtractedFilesResult> => {
  // Tracks any errors encountered during traversal. Mutated in place.
  const errors: JsonDataError[] = [];

  // Tracks each new valid extracted file path seen (rebased to be relative to
  // guide.json) in the guide json node. Mutated in place, and used
  // to validate the uniqueness of an extracted path encountered.
  const uniqueFilePaths = {};

  mapValuesDeep(guideJson, (relpath: string, key: string, parts) => {
    // If not marked with the @suffix, there's nothing to do.
    if (!FILEPATH_MARKED_RE.test(key)) return;

    const objPathToFieldStr = ObjPath.stringify(parts);
    const inlinObjPathStr = objPathToFieldStr.replace(FILEPATH_MARKED_RE, "");

    // If there is inlined content present already, then nothing more to do.
    if (hasIn(guideJson, inlinObjPathStr)) return;

    // Check if the extracted path found at the current field path is valid
    const invalidFilePathError = validateExtractedFilePath(
      relpath,
      path.resolve(guideDirCtx.abspath, GUIDE_JSON),
      uniqueFilePaths,
      objPathToFieldStr,
    );
    if (invalidFilePathError) {
      errors.push(invalidFilePathError);
      // Wipe the invalid file path in the node so the final guide json
      // object ends up with only valid file paths, this way guide writer
      // can see only valid file paths and use those when pulling.
      set(guideJson, inlinObjPathStr, undefined);
      set(guideJson, objPathToFieldStr, undefined);
      return;
    }

    // By this point we have a valid extracted file path, so attempt to read the file.
    const [content, readExtractedFileError] = readExtractedFileSync(
      relpath,
      guideDirCtx as any, // Type assertion needed since shared helpers don't know about guide yet
      key,
    );

    if (readExtractedFileError) {
      errors.push(readExtractedFileError);

      // If there's an error, replace the extracted file path with the original one, and set the
      // inlined field path in guide object with empty content, so we know
      // we do not need to try inlining again.
      set(guideJson, objPathToFieldStr, relpath);
      set(guideJson, inlinObjPathStr, undefined);
      return;
    }

    // Inline the file content and remove the extracted file path.
    set(guideJson, objPathToFieldStr, relpath);
    set(guideJson, inlinObjPathStr, content);
  });

  return [guideJson, errors];
};

/*
 * List and read all guide directories found for the given command target.
 *
 * Note, it assumes the valid command target.
 */
export const readAllForCommandTarget = async (
  target: GuideCommandTarget,
  opts: ReadGuideDirOpts = {},
): Promise<[GuideDirData[], SourceError[]]> => {
  const { type: targetType, context: targetCtx } = target;

  if (!targetCtx.exists) {
    const subject =
      targetType === "guideDir"
        ? "a guide directory at"
        : "guide directories in";

    return ux.error(`Cannot locate ${subject} \`${targetCtx.abspath}\``);
  }

  switch (targetType) {
    case "guideDir": {
      return readGuideDirs([targetCtx], opts);
    }

    case "guidesIndexDir": {
      const dirents = await fs.readdir(targetCtx.abspath, {
        withFileTypes: true,
      });

      const promises = dirents.map(async (dirent) => {
        const abspath = path.resolve(targetCtx.abspath, dirent.name);
        const guideDirCtx: GuideDirContext = {
          type: "guide",
          key: dirent.name,
          abspath,
          exists: await isGuideDir(abspath),
        };
        return guideDirCtx;
      });

      const guideDirCtxs = (await Promise.all(promises)).filter(
        (guideDirCtx) => guideDirCtx.exists,
      );
      return readGuideDirs(guideDirCtxs, opts);
    }

    default:
      throw new Error(`Invalid guide command target: ${target}`);
  }
};
