import path from "node:path";

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
import {
  readExtractedFileSync,
  validateExtractedFilePath,
} from "@/lib/marshal/shared/helpers";
import { ReusableStepDirContext } from "@/lib/run-context";

import { FILEPATH_MARKED_RE } from "../shared/const.isomorphic";
import {
  isReusableStepDir,
  lsReusableStepJson,
  ReusableStepCommandTarget,
} from "./helpers";
import { REUSABLE_STEP_JSON } from "./processor.isomorphic";

// Hydrated reusable step directory context with its content.
export type ReusableStepDirData = ReusableStepDirContext & {
  content: AnyObj;
};

/*
 * For the given list of reusable step directory contexts, read each reusable step dir and
 * return reusable step directory data.
 */
const readReusableStepDirs = async (
  reusableStepDirCtxs: ReusableStepDirContext[],
  opts: ReadReusableStepDirOpts = {},
): Promise<[ReusableStepDirData[], SourceError[]]> => {
  const reusableSteps: ReusableStepDirData[] = [];
  const errors: SourceError[] = [];

  for (const reusableStepDirCtx of reusableStepDirCtxs) {
    // eslint-disable-next-line no-await-in-loop
    const [reusableStep, readErrors] = await readReusableStepDir(
      reusableStepDirCtx,
      opts,
    );

    if (readErrors.length > 0) {
      const reusableStepJsonPath = path.resolve(
        reusableStepDirCtx.abspath,
        REUSABLE_STEP_JSON,
      );

      const e = new SourceError(formatErrors(readErrors), reusableStepJsonPath);
      errors.push(e);
      continue;
    }

    reusableSteps.push({ ...reusableStepDirCtx, content: reusableStep! });
  }

  return [reusableSteps, errors];
};

/*
 * The main read function that takes the reusable step directory context, then reads
 * the reusable step json from the file system and returns the reusable step data obj.
 */
type ReadReusableStepDirOpts = {
  withExtractedFiles?: boolean;
};

export const readReusableStepDir = async (
  reusableStepDirCtx: ReusableStepDirContext,
  opts: ReadReusableStepDirOpts = {},
): Promise<ParseJsonResult | JoinExtractedFilesResult> => {
  const { abspath } = reusableStepDirCtx;
  const { withExtractedFiles = false } = opts;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const reusableStepJsonPath = await lsReusableStepJson(abspath);
  if (!reusableStepJsonPath)
    throw new Error(`${abspath} is not a reusable step directory`);

  const result = await readJson(reusableStepJsonPath);
  if (!result[0]) return result;

  let [reusableStepJson] = result;

  reusableStepJson = omitDeep(reusableStepJson, ["__readonly"]);

  return withExtractedFiles
    ? joinExtractedFiles(reusableStepDirCtx, reusableStepJson)
    : [reusableStepJson, []];
};

type JoinExtractedFilesResult = [AnyObj, JsonDataError[]];

const joinExtractedFiles = async (
  reusableStepDirCtx: ReusableStepDirContext,
  reusableStepJson: AnyObj,
): Promise<JoinExtractedFilesResult> => {
  // Tracks any errors encountered during traversal. Mutated in place.
  const errors: JsonDataError[] = [];

  // Tracks each new valid extracted file path seen (rebased to be relative to
  // reusable-step.json) in the reusable step json node. Mutated in place, and used
  // to validate the uniqueness of an extracted path encountered.
  const uniqueFilePaths = {};

  mapValuesDeep(reusableStepJson, (relpath: string, key: string, parts) => {
    // If not marked with the @suffix, there's nothing to do.
    if (!FILEPATH_MARKED_RE.test(key)) return;

    const objPathToFieldStr = ObjPath.stringify(parts);
    const inlinObjPathStr = objPathToFieldStr.replace(FILEPATH_MARKED_RE, "");

    // If there is inlined content present already, then nothing more to do.
    if (hasIn(reusableStepJson, inlinObjPathStr)) return;

    // Check if the extracted path found at the current field path is valid
    const invalidFilePathError = validateExtractedFilePath(
      relpath,
      path.resolve(reusableStepDirCtx.abspath, REUSABLE_STEP_JSON),
      uniqueFilePaths,
      objPathToFieldStr,
    );
    if (invalidFilePathError) {
      errors.push(invalidFilePathError);
      // Wipe the invalid file path in the node so the final reusable step json
      // object ends up with only valid file paths, this way reusable step writer
      // can see only valid file paths and use those when pulling.
      set(reusableStepJson, inlinObjPathStr, undefined);
      set(reusableStepJson, objPathToFieldStr, undefined);
      return;
    }

    // By this point we have a valid extracted file path, so attempt to read the file.
    const [content, readExtractedFileError] = readExtractedFileSync(
      relpath,
      reusableStepDirCtx,
      key,
    );

    if (readExtractedFileError) {
      errors.push(readExtractedFileError);

      // If there's an error, replace the extracted file path with the original one, and set the
      // inlined field path in reusable step object with empty content, so we know
      // we do not need to try inlining again.
      set(reusableStepJson, objPathToFieldStr, relpath);
      set(reusableStepJson, inlinObjPathStr, undefined);
      return;
    }

    // Inline the file content and remove the extracted file path.
    set(reusableStepJson, objPathToFieldStr, relpath);
    set(reusableStepJson, inlinObjPathStr, content);
  });

  return [reusableStepJson, errors];
};

/*
 * List and read all reusable step directories found for the given command target.
 *
 * Note, it assumes the valid command target.
 */
export const readAllForCommandTarget = async (
  target: ReusableStepCommandTarget,
  opts: ReadReusableStepDirOpts = {},
): Promise<[ReusableStepDirData[], SourceError[]]> => {
  const { type: targetType, context: targetCtx } = target;

  if (!targetCtx.exists) {
    const subject =
      targetType === "reusableStepDir"
        ? "a reusable step directory at"
        : "reusable step directories in";

    return ux.error(`Cannot locate ${subject} \`${targetCtx.abspath}\``);
  }

  switch (targetType) {
    case "reusableStepDir": {
      return readReusableStepDirs([targetCtx], opts);
    }

    case "reusableStepsIndexDir": {
      const dirents = await fs.readdir(targetCtx.abspath, {
        withFileTypes: true,
      });

      const promises = dirents.map(async (dirent) => {
        const abspath = path.resolve(targetCtx.abspath, dirent.name);
        const reusableStepDirCtx: ReusableStepDirContext = {
          type: "reusable_step",
          key: dirent.name,
          abspath,
          exists: await isReusableStepDir(abspath),
        };
        return reusableStepDirCtx;
      });

      const reusableStepDirCtxs = (await Promise.all(promises)).filter(
        (reusableStepDirCtx) => reusableStepDirCtx.exists,
      );
      return readReusableStepDirs(reusableStepDirCtxs, opts);
    }

    default:
      throw new Error(`Invalid reusable step command target: ${target}`);
  }
};
