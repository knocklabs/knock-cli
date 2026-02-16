import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { BroadcastDirContext } from "@/lib/run-context";

import { isBroadcastDir } from "./helpers";
import {
  BROADCAST_JSON,
  BroadcastDirBundle,
  buildBroadcastDirBundle,
} from "./processor.isomorphic";
import { readBroadcastDir } from "./reader";
import type { BroadcastData } from "./types";

type WriteOpts = {
  withSchema?: boolean;
};

const BROADCAST_SCHEMA = "https://schemas.knock.app/cli/broadcast.json";

export const writeBroadcastDirFromData = async (
  broadcastDirCtx: BroadcastDirContext,
  remoteBroadcast: BroadcastData<WithAnnotation>,
  options?: WriteOpts,
): Promise<void> => {
  const { withSchema = false } = options || {};

  const [localBroadcast] = broadcastDirCtx.exists
    ? await readBroadcastDir(broadcastDirCtx, { withExtractedFiles: true })
    : [];

  const bundle = buildBroadcastDirBundle(
    remoteBroadcast,
    localBroadcast,
    withSchema ? BROADCAST_SCHEMA : undefined,
  );

  return writeBroadcastDirFromBundle(broadcastDirCtx, bundle);
};

export const writeBroadcastDirFromBundle = async (
  broadcastDirCtx: BroadcastDirContext,
  broadcastDirBundle: BroadcastDirBundle,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (broadcastDirCtx.exists) {
      await fs.copy(broadcastDirCtx.abspath, backupDirPath);
      await fs.emptyDir(broadcastDirCtx.abspath);
    }

    const promises = Object.entries(broadcastDirBundle).map(
      ([relpath, fileContent]) => {
        const filePath = path.resolve(broadcastDirCtx.abspath, relpath);

        return relpath === BROADCAST_JSON
          ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
          : fs.outputFile(
              filePath,
              typeof fileContent === "string" ? fileContent : "",
            );
      },
    );
    await Promise.all(promises);
  } catch (error) {
    if (broadcastDirCtx.exists) {
      await fs.emptyDir(broadcastDirCtx.abspath);
      await fs.copy(backupDirPath, broadcastDirCtx.abspath);
    } else {
      await fs.remove(broadcastDirCtx.abspath);
    }

    throw error;
  } finally {
    await fs.remove(backupDirPath);
  }
};

const pruneBroadcastsIndexDir = async (
  indexDirCtx: DirContext,
  remoteBroadcasts: BroadcastData<WithAnnotation>[],
): Promise<void> => {
  const broadcastsByKey = Object.fromEntries(
    remoteBroadcasts.map((b) => [b.key.toLowerCase(), b]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });

  const promises = dirents.map(async (dirent) => {
    const direntName = dirent.name.toLowerCase();
    const direntPath = path.resolve(indexDirCtx.abspath, direntName);

    if ((await isBroadcastDir(direntPath)) && broadcastsByKey[direntName]) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

export const writeBroadcastsIndexDir = async (
  indexDirCtx: DirContext,
  remoteBroadcasts: BroadcastData<WithAnnotation>[],
  options?: WriteOpts,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await pruneBroadcastsIndexDir(indexDirCtx, remoteBroadcasts);
    }

    const writeBroadcastDirPromises = remoteBroadcasts.map(
      async (broadcast) => {
        const broadcastDirPath = path.resolve(
          indexDirCtx.abspath,
          broadcast.key,
        );

        const broadcastDirCtx: BroadcastDirContext = {
          type: "broadcast",
          key: broadcast.key,
          abspath: broadcastDirPath,
          exists: indexDirCtx.exists
            ? await isBroadcastDir(broadcastDirPath)
            : false,
        };

        return writeBroadcastDirFromData(broadcastDirCtx, broadcast, options);
      },
    );

    await Promise.all(writeBroadcastDirPromises);
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
