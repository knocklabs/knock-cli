import path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { formatErrors, SourceError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import { omitDeep } from "@/lib/helpers/object.isomorphic";
import { ReusableRequestDirContext } from "@/lib/run-context";

import {
  isReusableRequestDir,
  lsReusableRequestJson,
  ReusableRequestCommandTarget,
} from "./helpers";
import { REUSABLE_REQUEST_JSON } from "./processor.isomorphic";

// Hydrated reusable request directory context with its content.
export type ReusableRequestDirData = ReusableRequestDirContext & {
  content: Record<string, unknown>;
};

const readReusableRequestDirs = async (
  reusableRequestDirCtxs: ReusableRequestDirContext[],
): Promise<[ReusableRequestDirData[], SourceError[]]> => {
  const reusableRequests: ReusableRequestDirData[] = [];
  const errors: SourceError[] = [];

  for (const reusableRequestDirCtx of reusableRequestDirCtxs) {
    // eslint-disable-next-line no-await-in-loop
    const [reusableRequest, readErrors] = await readReusableRequestDir(
      reusableRequestDirCtx,
    );

    if (readErrors.length > 0) {
      const jsonPath = path.resolve(
        reusableRequestDirCtx.abspath,
        REUSABLE_REQUEST_JSON,
      );

      const error = new SourceError(formatErrors(readErrors), jsonPath);
      errors.push(error);
      continue;
    }

    reusableRequests.push({
      ...reusableRequestDirCtx,
      content: reusableRequest!,
    });
  }

  return [reusableRequests, errors];
};

/*
 * Reads reusable_request.json from the directory and returns the data object.
 */
export const readReusableRequestDir = async (
  reusableRequestDirCtx: ReusableRequestDirContext,
): Promise<ParseJsonResult> => {
  const { abspath } = reusableRequestDirCtx;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const jsonPath = await lsReusableRequestJson(abspath);
  if (!jsonPath) {
    throw new Error(`${abspath} is not a reusable request directory`);
  }

  const result = await readJson(jsonPath);
  if (!result[0]) return result;

  const [reusableRequestJson] = result;
  const readonlyFields = reusableRequestJson.__readonly;
  const reusableRequest = omitDeep(reusableRequestJson, ["__readonly"]);

  // The API annotates type as readonly, but upsert and validate require it
  // in the request body. Keep it when the annotation parked it under __readonly.
  if (
    reusableRequest.type === undefined &&
    readonlyFields &&
    typeof readonlyFields === "object" &&
    "type" in readonlyFields
  ) {
    reusableRequest.type = (readonlyFields as { type?: unknown }).type;
  }

  return [reusableRequest, []];
};

/*
 * List and read all reusable request directories found for the given command
 * target.
 */
export const readAllForCommandTarget = async (
  target: ReusableRequestCommandTarget,
): Promise<[ReusableRequestDirData[], SourceError[]]> => {
  const { type: targetType, context: targetCtx } = target;

  if (!targetCtx.exists) {
    const subject =
      targetType === "reusableRequestDir"
        ? "a reusable request directory at"
        : "reusable request directories in";

    return ux.error(`Cannot locate ${subject} \`${targetCtx.abspath}\``);
  }

  switch (targetType) {
    case "reusableRequestDir": {
      return readReusableRequestDirs([targetCtx]);
    }

    case "reusableRequestsIndexDir": {
      const dirents = await fs.readdir(targetCtx.abspath, {
        withFileTypes: true,
      });

      const promises = dirents.map(async (dirent) => {
        const abspath = path.resolve(targetCtx.abspath, dirent.name);
        const reusableRequestDirCtx: ReusableRequestDirContext = {
          type: "reusable_request",
          key: dirent.name,
          abspath,
          exists: await isReusableRequestDir(abspath),
        };
        return reusableRequestDirCtx;
      });

      const reusableRequestDirCtxs = (await Promise.all(promises)).filter(
        (reusableRequestDirCtx) => reusableRequestDirCtx.exists,
      );
      return readReusableRequestDirs(reusableRequestDirCtxs);
    }

    default:
      throw new Error(`Invalid reusable request command target: ${target}`);
  }
};
