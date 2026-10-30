import path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { formatErrors, SourceError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import { AnyObj, omitDeep } from "@/lib/helpers/object.isomorphic";
import { WarehouseSyncDirContext } from "@/lib/run-context";

import {
  isWarehouseSyncDir,
  lsWarehouseSyncJson,
  WarehouseSyncCommandTarget,
} from "./helpers";
import { WAREHOUSE_SYNC_JSON } from "./processor.isomorphic";

export type WarehouseSyncDirData = WarehouseSyncDirContext & {
  content: AnyObj;
};

const readWarehouseSyncDirs = async (
  warehouseSyncDirCtxs: WarehouseSyncDirContext[],
): Promise<[WarehouseSyncDirData[], SourceError[]]> => {
  const warehouseSyncs: WarehouseSyncDirData[] = [];
  const errors: SourceError[] = [];

  for (const warehouseSyncDirCtx of warehouseSyncDirCtxs) {
    // eslint-disable-next-line no-await-in-loop
    const [warehouseSync, readErrors] = await readWarehouseSyncDir(
      warehouseSyncDirCtx,
    );

    if (readErrors.length > 0) {
      const jsonPath = path.resolve(
        warehouseSyncDirCtx.abspath,
        WAREHOUSE_SYNC_JSON,
      );

      const e = new SourceError(formatErrors(readErrors), jsonPath);
      errors.push(e);
      continue;
    }

    warehouseSyncs.push({ ...warehouseSyncDirCtx, content: warehouseSync! });
  }

  return [warehouseSyncs, errors];
};

export const readWarehouseSyncDir = async (
  warehouseSyncDirCtx: WarehouseSyncDirContext,
): Promise<ParseJsonResult> => {
  const { abspath } = warehouseSyncDirCtx;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const jsonPath = await lsWarehouseSyncJson(abspath);
  if (!jsonPath) {
    throw new Error(`${abspath} is not a warehouse sync directory`);
  }

  const result = await readJson(jsonPath);
  if (!result[0]) return result;

  return [omitDeep(result[0], ["__readonly"]), []];
};

export const readAllForCommandTarget = async (
  target: WarehouseSyncCommandTarget,
): Promise<[WarehouseSyncDirData[], SourceError[]]> => {
  const { type: targetType, context: targetCtx } = target;

  if (!targetCtx.exists) {
    const subject =
      targetType === "warehouseSyncDir"
        ? "a warehouse sync directory at"
        : "warehouse sync directories in";

    return ux.error(`Cannot locate ${subject} \`${targetCtx.abspath}\``);
  }

  switch (targetType) {
    case "warehouseSyncDir": {
      return readWarehouseSyncDirs([targetCtx]);
    }

    case "warehouseSyncsIndexDir": {
      const dirents = await fs.readdir(targetCtx.abspath, {
        withFileTypes: true,
      });

      const promises = dirents.map(async (dirent) => {
        const abspath = path.resolve(targetCtx.abspath, dirent.name);
        const warehouseSyncDirCtx: WarehouseSyncDirContext = {
          type: "warehouse_sync",
          key: dirent.name,
          abspath,
          exists: await isWarehouseSyncDir(abspath),
        };
        return warehouseSyncDirCtx;
      });

      const warehouseSyncDirCtxs = (await Promise.all(promises)).filter(
        (ctx) => ctx.exists,
      );
      return readWarehouseSyncDirs(warehouseSyncDirCtxs);
    }

    default:
      throw new Error(`Invalid warehouse sync command target: ${target}`);
  }
};
