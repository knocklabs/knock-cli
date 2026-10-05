import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import {
  ProjectConfig,
  resolveResourceDir,
} from "@/lib/helpers/project-config";
import { checkSlugifiedFormat } from "@/lib/helpers/string";
import { GoalDirContext, RunContext } from "@/lib/run-context";

import { GOAL_JSON } from "./processor.isomorphic";

export const goalJsonPath = (goalDirCtx: GoalDirContext): string =>
  path.resolve(goalDirCtx.abspath, GOAL_JSON);

export const lsGoalJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const goalJsonPath = path.resolve(dirPath, GOAL_JSON);

  const exists = await fs.pathExists(goalJsonPath);
  return exists ? goalJsonPath : undefined;
};

export const isGoalDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsGoalJson(dirPath));

export const validateGoalKey = (input: string): string | undefined => {
  if (!checkSlugifiedFormat(input, { onlyLowerCase: true })) {
    return "must include only lowercase alphanumeric, dash, or underscore characters";
  }

  return undefined;
};

type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "goals-dir": DirContext | undefined;
  };
  args: {
    goalKey: string | undefined;
  };
};
type GoalDirTarget = {
  type: "goalDir";
  context: GoalDirContext;
};
type GoalsIndexDirTarget = {
  type: "goalsIndexDir";
  context: DirContext;
};
export type GoalCommandTarget = GoalDirTarget | GoalsIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
  projectConfig?: ProjectConfig,
): Promise<GoalCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  if (resourceDirCtx && resourceDirCtx.type !== "goal") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  if (flags.all && args.goalKey) {
    return ux.error(
      `goalKey arg \`${args.goalKey}\` cannot also be provided when using --all`,
    );
  }

  const goalsIndexDirCtx = await resolveResourceDir(
    projectConfig,
    "goal",
    runCwd,
  );

  if (flags.all) {
    if (resourceDirCtx && !flags["goals-dir"]) {
      return ux.error("Missing required flag goals-dir");
    }

    return {
      type: "goalsIndexDir",
      context: flags["goals-dir"] || goalsIndexDirCtx,
    };
  }

  if (args.goalKey) {
    if (resourceDirCtx && resourceDirCtx.key !== args.goalKey) {
      return ux.error(
        `Cannot run ${commandId} \`${args.goalKey}\` inside another goal directory:\n${resourceDirCtx.key}`,
      );
    }

    const targetDirPath = resourceDirCtx
      ? resourceDirCtx.abspath
      : path.resolve(goalsIndexDirCtx.abspath, args.goalKey);

    const goalDirCtx: GoalDirContext = {
      type: "goal",
      key: args.goalKey,
      abspath: targetDirPath,
      exists: await isGoalDir(targetDirPath),
    };

    return { type: "goalDir", context: goalDirCtx };
  }

  if (resourceDirCtx) {
    return { type: "goalDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:\ngoalKey");
};

export const formatTags = (
  goal: { tags?: string[] },
  opts?: { truncateAfter?: number; emptyDisplay?: string },
): string => {
  const { truncateAfter, emptyDisplay } = opts || {};

  if (!goal.tags || goal.tags.length === 0) {
    return emptyDisplay || "";
  }

  const tags = truncateAfter ? goal.tags.slice(0, truncateAfter) : goal.tags;

  const formatted = tags.join(", ");
  const moreCount = goal.tags.length - tags.length;

  return moreCount > 0 ? `${formatted} (+${moreCount} more)` : formatted;
};

export const formatStatus = (goal: { archived?: boolean }): string => {
  return goal.archived ? "archived" : "active";
};
