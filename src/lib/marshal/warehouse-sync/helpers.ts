import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import {
  ProjectConfig,
  resolveResourceDir,
} from "@/lib/helpers/project-config";
import { RunContext, WarehouseSyncDirContext } from "@/lib/run-context";

import { WAREHOUSE_SYNC_JSON } from "./processor.isomorphic";
import { WarehouseSyncData } from "./types";

const TARGET_TYPE_LABELS: Record<WarehouseSyncData["target_type"], string> = {
  user: "Users",
  tenant: "Tenants",
  object: "Objects",
  static_audience_membership: "Audience members",
  subscription: "Subscriptions",
};

/*
 * Formats what a sync writes to, e.g. "Objects (projects)".
 */
export const formatTarget = (
  sync: Pick<WarehouseSyncData, "target_type" | "target">,
): string => {
  const label = TARGET_TYPE_LABELS[sync.target_type];
  const detail = sync.target?.collection ?? sync.target?.audience_key;

  return detail ? `${label} (${detail})` : label;
};

/*
 * Formats where a sync reads from: a table or view, or a SQL query.
 */
export const formatSource = (
  sync: Pick<WarehouseSyncData, "source">,
): string => {
  const { source } = sync;
  if (!source) return "-";
  if (source.mode === "sql") return "SQL query";

  return [source.schema, source.name].filter(Boolean).join(".");
};

export const warehouseSyncJsonPath = (
  warehouseSyncDirCtx: WarehouseSyncDirContext,
): string => path.resolve(warehouseSyncDirCtx.abspath, WAREHOUSE_SYNC_JSON);

export const lsWarehouseSyncJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const warehouseSyncJsonPath = path.resolve(dirPath, WAREHOUSE_SYNC_JSON);

  const exists = await fs.pathExists(warehouseSyncJsonPath);
  return exists ? warehouseSyncJsonPath : undefined;
};

export const isWarehouseSyncDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsWarehouseSyncJson(dirPath));

type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "warehouse-syncs-dir": DirContext | undefined;
  };
  args: {
    warehouseSyncKey: string | undefined;
  };
};
type WarehouseSyncDirTarget = {
  type: "warehouseSyncDir";
  context: WarehouseSyncDirContext;
};
type WarehouseSyncsIndexDirTarget = {
  type: "warehouseSyncsIndexDir";
  context: DirContext;
};
export type WarehouseSyncCommandTarget =
  | WarehouseSyncDirTarget
  | WarehouseSyncsIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
  projectConfig?: ProjectConfig,
): Promise<WarehouseSyncCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  if (resourceDirCtx && resourceDirCtx.type !== "warehouse_sync") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  if (flags.all && args.warehouseSyncKey) {
    return ux.error(
      `warehouseSyncKey arg \`${args.warehouseSyncKey}\` cannot also be provided when using --all`,
    );
  }

  const warehouseSyncsIndexDirCtx = await resolveResourceDir(
    projectConfig,
    "warehouse_sync",
    runCwd,
  );

  if (flags.all) {
    if (resourceDirCtx && !flags["warehouse-syncs-dir"]) {
      return ux.error("Missing required flag warehouse-syncs-dir");
    }

    return {
      type: "warehouseSyncsIndexDir",
      context: flags["warehouse-syncs-dir"] || warehouseSyncsIndexDirCtx,
    };
  }

  if (args.warehouseSyncKey) {
    if (resourceDirCtx && resourceDirCtx.key !== args.warehouseSyncKey) {
      return ux.error(
        `Cannot run ${commandId} \`${args.warehouseSyncKey}\` inside another warehouse sync directory:\n${resourceDirCtx.key}`,
      );
    }

    const targetDirPath = resourceDirCtx
      ? resourceDirCtx.abspath
      : path.resolve(warehouseSyncsIndexDirCtx.abspath, args.warehouseSyncKey);

    const warehouseSyncDirCtx: WarehouseSyncDirContext = {
      type: "warehouse_sync",
      key: args.warehouseSyncKey,
      abspath: targetDirPath,
      exists: await isWarehouseSyncDir(targetDirPath),
    };

    return { type: "warehouseSyncDir", context: warehouseSyncDirCtx };
  }

  if (resourceDirCtx) {
    return { type: "warehouseSyncDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:\nwarehouseSyncKey");
};
