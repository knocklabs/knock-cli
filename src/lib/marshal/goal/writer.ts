import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { GoalDirContext } from "@/lib/run-context";

import { isGoalDir } from "./helpers";
import {
  buildGoalDirBundle,
  GOAL_JSON,
  GoalDirBundle,
} from "./processor.isomorphic";
import { readGoalDir } from "./reader";
import { GoalData } from "./types";

type WriteOpts = {
  withSchema?: boolean;
};

const GOAL_SCHEMA = "https://schemas.knock.app/cli/goal.json";

export const writeGoalDirFromData = async (
  goalDirCtx: GoalDirContext,
  remoteGoal: GoalData<WithAnnotation>,
  options?: WriteOpts,
): Promise<void> => {
  const { withSchema = false } = options || {};

  const [localGoal] = goalDirCtx.exists ? await readGoalDir(goalDirCtx) : [];

  const bundle = buildGoalDirBundle(
    remoteGoal,
    localGoal,
    withSchema ? GOAL_SCHEMA : undefined,
  );

  return writeGoalDirFromBundle(goalDirCtx, bundle);
};

const writeGoalDirFromBundle = async (
  goalDirCtx: GoalDirContext,
  goalDirBundle: GoalDirBundle,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (goalDirCtx.exists) {
      await fs.copy(goalDirCtx.abspath, backupDirPath);
      await fs.emptyDir(goalDirCtx.abspath);
    }

    const promises = Object.entries(goalDirBundle).map(
      ([relpath, fileContent]) => {
        const filePath = path.resolve(goalDirCtx.abspath, relpath);

        return relpath === GOAL_JSON
          ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
          : fs.outputFile(filePath, (fileContent as string) ?? "");
      },
    );
    await Promise.all(promises);
  } catch (error) {
    if (goalDirCtx.exists) {
      await fs.emptyDir(goalDirCtx.abspath);
      await fs.copy(backupDirPath, goalDirCtx.abspath);
    } else {
      await fs.remove(goalDirCtx.abspath);
    }

    throw error;
  } finally {
    await fs.remove(backupDirPath);
  }
};

const pruneGoalsIndexDir = async (
  indexDirCtx: DirContext,
  remoteGoals: GoalData<WithAnnotation>[],
): Promise<void> => {
  const goalsByKey = Object.fromEntries(
    remoteGoals.map((g) => [g.key.toLowerCase(), g]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });

  const promises = dirents.map(async (dirent) => {
    const direntPath = path.resolve(indexDirCtx.abspath, dirent.name);
    const direntKey = dirent.name.toLowerCase();

    if ((await isGoalDir(direntPath)) && goalsByKey[direntKey]) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

export const writeGoalsIndexDir = async (
  indexDirCtx: DirContext,
  remoteGoals: GoalData<WithAnnotation>[],
  options?: WriteOpts,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await pruneGoalsIndexDir(indexDirCtx, remoteGoals);
    }

    const writeGoalDirPromises = remoteGoals.map(async (goal) => {
      const goalDirPath = path.resolve(indexDirCtx.abspath, goal.key);

      const goalDirCtx: GoalDirContext = {
        type: "goal",
        key: goal.key,
        abspath: goalDirPath,
        exists: indexDirCtx.exists ? await isGoalDir(goalDirPath) : false,
      };

      return writeGoalDirFromData(goalDirCtx, goal, options);
    });

    await Promise.all(writeGoalDirPromises);
  } catch (error) {
    if (indexDirCtx.exists) {
      await fs.emptyDir(indexDirCtx.abspath);
      await fs.copy(backupDirPath, indexDirCtx.abspath);
    } else {
      await fs.remove(indexDirCtx.abspath);
    }

    throw error;
  } finally {
    await fs.remove(backupDirPath);
  }
};

export { pruneGoalsIndexDir, writeGoalDirFromBundle };
