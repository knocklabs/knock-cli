import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";
import { take } from "lodash";

import { DirContext } from "@/lib/helpers/fs";
import {
  ProjectConfig,
  resolveResourceDir,
} from "@/lib/helpers/project-config";
import { checkSlugifiedFormat } from "@/lib/helpers/string";
import { BroadcastDirContext, RunContext } from "@/lib/run-context";

import { BROADCAST_JSON } from "./processor.isomorphic";
import type { BroadcastData } from "./types";

export const broadcastJsonPath = (
  broadcastDirCtx: BroadcastDirContext,
): string => path.resolve(broadcastDirCtx.abspath, BROADCAST_JSON);

export const validateBroadcastKey = (input: string): string | undefined => {
  if (!checkSlugifiedFormat(input, { onlyLowerCase: true })) {
    return "must include only lowercase alphanumeric, dash, or underscore characters";
  }

  return undefined;
};

export const lsBroadcastJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const broadcastJsonPath = path.resolve(dirPath, BROADCAST_JSON);

  const exists = await fs.pathExists(broadcastJsonPath);
  return exists ? broadcastJsonPath : undefined;
};

export const isBroadcastDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsBroadcastJson(dirPath));

type FormatCategoriesOpts = {
  truncateAfter?: number;
  emptyDisplay?: string;
};

export const formatCategories = (
  broadcast: BroadcastData,
  opts: FormatCategoriesOpts = {},
): string => {
  const { categories } = broadcast;
  const { truncateAfter: limit, emptyDisplay = "" } = opts;

  if (!categories) return emptyDisplay;

  const count = categories.length;
  if (!limit || limit >= count) return categories.join(", ");

  return take(categories, limit).join(", ") + ` (+ ${count - limit} more)`;
};

export const formatStatus = (broadcast: BroadcastData): string =>
  broadcast.status;

type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "broadcasts-dir": DirContext | undefined;
  };
  args: {
    broadcastKey: string | undefined;
  };
};

type BroadcastDirTarget = {
  type: "broadcastDir";
  context: BroadcastDirContext;
};

type BroadcastsIndexDirTarget = {
  type: "broadcastsIndexDir";
  context: DirContext;
};

export type BroadcastCommandTarget =
  | BroadcastDirTarget
  | BroadcastsIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
  projectConfig?: ProjectConfig,
): Promise<BroadcastCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  if (resourceDirCtx && resourceDirCtx.type !== "broadcast") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  if (flags.all && args.broadcastKey) {
    return ux.error(
      `broadcastKey arg \`${args.broadcastKey}\` cannot also be provided when using --all`,
    );
  }

  const broadcastsIndexDirCtx = await resolveResourceDir(
    projectConfig,
    "broadcast",
    runCwd,
  );

  if (flags.all) {
    if (resourceDirCtx && !flags["broadcasts-dir"]) {
      return ux.error("Missing required flag broadcasts-dir");
    }

    return {
      type: "broadcastsIndexDir",
      context: flags["broadcasts-dir"] || broadcastsIndexDirCtx,
    };
  }

  if (args.broadcastKey) {
    if (resourceDirCtx && resourceDirCtx.key !== args.broadcastKey) {
      return ux.error(
        `Cannot run ${commandId} \`${args.broadcastKey}\` inside another broadcast directory:\n${resourceDirCtx.key}`,
      );
    }

    const targetDirPath = resourceDirCtx
      ? resourceDirCtx.abspath
      : path.resolve(broadcastsIndexDirCtx.abspath, args.broadcastKey);

    const broadcastDirCtx: BroadcastDirContext = {
      type: "broadcast",
      key: args.broadcastKey,
      abspath: targetDirPath,
      exists: await isBroadcastDir(targetDirPath),
    };

    return { type: "broadcastDir", context: broadcastDirCtx };
  }

  if (resourceDirCtx) {
    return { type: "broadcastDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:\nbroadcastKey");
};
