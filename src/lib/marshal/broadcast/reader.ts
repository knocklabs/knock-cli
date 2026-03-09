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
import { BroadcastDirContext } from "@/lib/run-context";

import {
  BroadcastCommandTarget,
  isBroadcastDir,
  lsBroadcastJson,
} from "./helpers";
import { BROADCAST_JSON } from "./processor.isomorphic";

export type BroadcastDirData = BroadcastDirContext & {
  content: AnyObj;
};

type ReadBroadcastDirOpts = {
  withExtractedFiles?: boolean;
};

const joinExtractedFiles = async (
  broadcastDirCtx: BroadcastDirContext,
  broadcastJson: AnyObj,
): Promise<[AnyObj, JsonDataError[]]> => {
  const errors: JsonDataError[] = [];
  const uniqueFilePaths: Record<string, boolean> = {};

  mapValuesDeep(broadcastJson, (relpath: string, key: string, parts) => {
    if (!FILEPATH_MARKED_RE.test(key)) return;

    const objPathToFieldStr = ObjPath.stringify(parts);
    const inlinObjPathStr = objPathToFieldStr.replace(FILEPATH_MARKED_RE, "");

    if (hasIn(broadcastJson, inlinObjPathStr)) return;

    const invalidFilePathError = validateExtractedFilePath(
      relpath,
      path.resolve(broadcastDirCtx.abspath, BROADCAST_JSON),
      uniqueFilePaths,
      objPathToFieldStr,
    );
    if (invalidFilePathError) {
      errors.push(invalidFilePathError);
      set(broadcastJson, objPathToFieldStr, undefined);
      set(broadcastJson, inlinObjPathStr, undefined);
      return;
    }

    const [content, readExtractedFileError] = readExtractedFileSync(
      relpath,
      broadcastDirCtx,
      objPathToFieldStr,
    );

    if (readExtractedFileError) {
      errors.push(readExtractedFileError);
      set(broadcastJson, objPathToFieldStr, relpath);
      set(broadcastJson, inlinObjPathStr, undefined);
      return;
    }

    set(broadcastJson, objPathToFieldStr, relpath);
    set(broadcastJson, inlinObjPathStr, content);
  });

  return [broadcastJson, errors];
};

const readBroadcastDirs = async (
  broadcastDirCtxs: BroadcastDirContext[],
  opts: ReadBroadcastDirOpts = {},
): Promise<[BroadcastDirData[], SourceError[]]> => {
  const broadcasts: BroadcastDirData[] = [];
  const errors: SourceError[] = [];

  for (const broadcastDirCtx of broadcastDirCtxs) {
    // eslint-disable-next-line no-await-in-loop
    const [broadcast, readErrors] = await readBroadcastDir(
      broadcastDirCtx,
      opts,
    );

    if (readErrors.length > 0) {
      const broadcastJsonPath = path.resolve(
        broadcastDirCtx.abspath,
        BROADCAST_JSON,
      );
      const e = new SourceError(formatErrors(readErrors), broadcastJsonPath);
      errors.push(e);
      continue;
    }

    broadcasts.push({ ...broadcastDirCtx, content: broadcast! });
  }

  return [broadcasts, errors];
};

export const readBroadcastDir = async (
  broadcastDirCtx: BroadcastDirContext,
  opts: ReadBroadcastDirOpts = {},
): Promise<ParseJsonResult | [AnyObj, JsonDataError[]]> => {
  const { abspath } = broadcastDirCtx;
  const { withExtractedFiles = false } = opts;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const broadcastJsonPath = await lsBroadcastJson(abspath);
  if (!broadcastJsonPath)
    throw new Error(`${abspath} is not a broadcast directory`);

  const result = await readJson(broadcastJsonPath);
  if (!result[0]) return result;

  let [broadcastJson] = result;

  broadcastJson = omitDeep(broadcastJson, ["__readonly"]);

  return withExtractedFiles
    ? joinExtractedFiles(broadcastDirCtx, broadcastJson)
    : [broadcastJson, []];
};

export const readAllForCommandTarget = async (
  target: BroadcastCommandTarget,
  opts: ReadBroadcastDirOpts = {},
): Promise<[BroadcastDirData[], SourceError[]]> => {
  const { type: targetType, context: targetCtx } = target;

  if (!targetCtx.exists) {
    const subject =
      targetType === "broadcastDir"
        ? "a broadcast directory at"
        : "broadcast directories in";

    return ux.error(`Cannot locate ${subject} \`${targetCtx.abspath}\``);
  }

  switch (targetType) {
    case "broadcastDir": {
      return readBroadcastDirs([targetCtx], opts);
    }

    case "broadcastsIndexDir": {
      const dirents = await fs.readdir(targetCtx.abspath, {
        withFileTypes: true,
      });

      const promises = dirents.map(async (dirent) => {
        const abspath = path.resolve(targetCtx.abspath, dirent.name);
        const broadcastDirCtx: BroadcastDirContext = {
          type: "broadcast",
          key: dirent.name,
          abspath,
          exists: await isBroadcastDir(abspath),
        };
        return broadcastDirCtx;
      });

      const broadcastDirCtxs = (await Promise.all(promises)).filter(
        (broadcastDirCtx) => broadcastDirCtx.exists,
      );
      return readBroadcastDirs(broadcastDirCtxs, opts);
    }

    default:
      throw new Error(`Invalid broadcast command target: ${target}`);
  }
};
