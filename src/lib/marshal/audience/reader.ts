import path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { formatErrors, SourceError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import { AnyObj, omitDeep } from "@/lib/helpers/object.isomorphic";
import { AudienceDirContext } from "@/lib/run-context";

import {
  AudienceCommandTarget,
  isAudienceDir,
  lsAudienceJson,
} from "./helpers";
import { AUDIENCE_JSON } from "./processor.isomorphic";

// Hydrated audience directory context with its content.
export type AudienceDirData = AudienceDirContext & {
  content: AnyObj;
};

/*
 * For the given list of audience directory contexts, read each audience dir and
 * return audience directory data.
 */
const readAudienceDirs = async (
  audienceDirCtxs: AudienceDirContext[],
): Promise<[AudienceDirData[], SourceError[]]> => {
  const audiences: AudienceDirData[] = [];
  const errors: SourceError[] = [];

  for (const audienceDirCtx of audienceDirCtxs) {
    // eslint-disable-next-line no-await-in-loop
    const [audience, readErrors] = await readAudienceDir(audienceDirCtx);

    if (readErrors.length > 0) {
      const audienceJsonPath = path.resolve(
        audienceDirCtx.abspath,
        AUDIENCE_JSON,
      );

      const e = new SourceError(formatErrors(readErrors), audienceJsonPath);
      errors.push(e);
      continue;
    }

    audiences.push({ ...audienceDirCtx, content: audience! });
  }

  return [audiences, errors];
};

/*
 * The main read function that takes the audience directory context, then reads
 * the audience json from the file system and returns the audience data obj.
 */
export const readAudienceDir = async (
  audienceDirCtx: AudienceDirContext,
): Promise<ParseJsonResult> => {
  const { abspath } = audienceDirCtx;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const audienceJsonPath = await lsAudienceJson(abspath);
  if (!audienceJsonPath)
    throw new Error(`${abspath} is not an audience directory`);

  const result = await readJson(audienceJsonPath);
  if (!result[0]) return result;

  let [audienceJson] = result;

  audienceJson = omitDeep(audienceJson, ["__readonly"]);

  return [audienceJson, []];
};

/*
 * List and read all audience directories found for the given command target.
 *
 * Note, it assumes the valid command target.
 */
export const readAllForCommandTarget = async (
  target: AudienceCommandTarget,
): Promise<[AudienceDirData[], SourceError[]]> => {
  const { type: targetType, context: targetCtx } = target;

  if (!targetCtx.exists) {
    const subject =
      targetType === "audienceDir"
        ? "an audience directory at"
        : "audience directories in";

    return ux.error(`Cannot locate ${subject} \`${targetCtx.abspath}\``);
  }

  switch (targetType) {
    case "audienceDir": {
      return readAudienceDirs([targetCtx]);
    }

    case "audiencesIndexDir": {
      const dirents = await fs.readdir(targetCtx.abspath, {
        withFileTypes: true,
      });

      const promises = dirents.map(async (dirent) => {
        const abspath = path.resolve(targetCtx.abspath, dirent.name);
        const audienceDirCtx: AudienceDirContext = {
          type: "audience",
          key: dirent.name,
          abspath,
          exists: await isAudienceDir(abspath),
        };
        return audienceDirCtx;
      });

      const audienceDirCtxs = (await Promise.all(promises)).filter(
        (audienceDirCtx) => audienceDirCtx.exists,
      );
      return readAudienceDirs(audienceDirCtxs);
    }

    default:
      throw new Error(`Invalid audience command target: ${target}`);
  }
};
