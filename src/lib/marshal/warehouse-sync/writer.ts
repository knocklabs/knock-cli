import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { WarehouseSyncDirContext } from "@/lib/run-context";

import { isWarehouseSyncDir } from "./helpers";
import {
  buildWarehouseSyncJson,
  WAREHOUSE_SYNC_JSON,
} from "./processor.isomorphic";
import { WarehouseSyncData } from "./types";

export const writeWarehouseSyncDirFromData = async (
  warehouseSyncDirCtx: WarehouseSyncDirContext,
  remoteWarehouseSync: WarehouseSyncData,
): Promise<void> => {
  const filePath = path.resolve(
    warehouseSyncDirCtx.abspath,
    WAREHOUSE_SYNC_JSON,
  );

  return fs.outputJson(filePath, buildWarehouseSyncJson(remoteWarehouseSync), {
    spaces: DOUBLE_SPACES,
  });
};

const pruneWarehouseSyncsIndexDir = async (
  indexDirCtx: DirContext,
  remoteWarehouseSyncs: WarehouseSyncData[],
): Promise<void> => {
  const syncsByKey = Object.fromEntries(
    remoteWarehouseSyncs.map((s) => [s.key.toLowerCase(), s]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });

  const promises = dirents.map(async (dirent) => {
    const direntPath = path.resolve(indexDirCtx.abspath, dirent.name);
    const direntKey = dirent.name.toLowerCase();

    if ((await isWarehouseSyncDir(direntPath)) && syncsByKey[direntKey]) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

export const writeWarehouseSyncsIndexDir = async (
  indexDirCtx: DirContext,
  remoteWarehouseSyncs: WarehouseSyncData[],
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await pruneWarehouseSyncsIndexDir(indexDirCtx, remoteWarehouseSyncs);
    }

    const promises = remoteWarehouseSyncs.map(async (sync) => {
      const dirPath = path.resolve(indexDirCtx.abspath, sync.key);

      const warehouseSyncDirCtx: WarehouseSyncDirContext = {
        type: "warehouse_sync",
        key: sync.key,
        abspath: dirPath,
        exists: indexDirCtx.exists ? await isWarehouseSyncDir(dirPath) : false,
      };

      return writeWarehouseSyncDirFromData(warehouseSyncDirCtx, sync);
    });

    await Promise.all(promises);
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
