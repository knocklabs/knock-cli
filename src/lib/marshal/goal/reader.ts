import path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { formatErrors, SourceError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import { AnyObj, omitDeep } from "@/lib/helpers/object.isomorphic";
import { GoalDirContext } from "@/lib/run-context";

import { GoalCommandTarget, isGoalDir, lsGoalJson } from "./helpers";
import { GOAL_JSON } from "./processor.isomorphic";

export type GoalDirData = GoalDirContext & {
  content: AnyObj;
};

const readGoalDirs = async (
  goalDirCtxs: GoalDirContext[],
): Promise<[GoalDirData[], SourceError[]]> => {
  const goals: GoalDirData[] = [];
  const errors: SourceError[] = [];

  for (const goalDirCtx of goalDirCtxs) {
    // eslint-disable-next-line no-await-in-loop
    const [goal, readErrors] = await readGoalDir(goalDirCtx);

    if (readErrors.length > 0) {
      const goalJsonPath = path.resolve(goalDirCtx.abspath, GOAL_JSON);

      const e = new SourceError(formatErrors(readErrors), goalJsonPath);
      errors.push(e);
      continue;
    }

    goals.push({ ...goalDirCtx, content: goal! });
  }

  return [goals, errors];
};

export const readGoalDir = async (
  goalDirCtx: GoalDirContext,
): Promise<ParseJsonResult> => {
  const { abspath } = goalDirCtx;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const goalJsonPath = await lsGoalJson(abspath);
  if (!goalJsonPath) throw new Error(`${abspath} is not a goal directory`);

  const result = await readJson(goalJsonPath);
  if (!result[0]) return result;

  let [goalJson] = result;

  goalJson = omitDeep(goalJson, ["__readonly"]);

  return [goalJson, []];
};

export const readAllForCommandTarget = async (
  target: GoalCommandTarget,
): Promise<[GoalDirData[], SourceError[]]> => {
  const { type: targetType, context: targetCtx } = target;

  if (!targetCtx.exists) {
    const subject =
      targetType === "goalDir" ? "a goal directory at" : "goal directories in";

    return ux.error(`Cannot locate ${subject} \`${targetCtx.abspath}\``);
  }

  switch (targetType) {
    case "goalDir": {
      return readGoalDirs([targetCtx]);
    }

    case "goalsIndexDir": {
      const dirents = await fs.readdir(targetCtx.abspath, {
        withFileTypes: true,
      });

      const promises = dirents.map(async (dirent) => {
        const abspath = path.resolve(targetCtx.abspath, dirent.name);
        const goalDirCtx: GoalDirContext = {
          type: "goal",
          key: dirent.name,
          abspath,
          exists: await isGoalDir(abspath),
        };
        return goalDirCtx;
      });

      const goalDirCtxs = (await Promise.all(promises)).filter(
        (goalDirCtx) => goalDirCtx.exists,
      );
      return readGoalDirs(goalDirCtxs);
    }

    default:
      throw new Error(`Invalid goal command target: ${target}`);
  }
};
