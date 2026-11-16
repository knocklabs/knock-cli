import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { ReusableRequestDirContext } from "@/lib/run-context";

import { isReusableRequestDir } from "./helpers";
import {
  buildReusableRequestDirBundle,
  REUSABLE_REQUEST_JSON,
  ReusableRequestDirBundle,
} from "./processor.isomorphic";
import { ReusableRequestData } from "./types";

/*
 * Writes a remote reusable request into a local directory.
 * Reusable requests have no extractable fields, so the local copy is not
 * used to preserve extracted file paths.
 */
export const writeReusableRequestDirFromData = async (
  reusableRequestDirCtx: ReusableRequestDirContext,
  remoteReusableRequest: ReusableRequestData<WithAnnotation>,
): Promise<void> => {
  const bundle = buildReusableRequestDirBundle(remoteReusableRequest);

  return writeReusableRequestDirFromBundle(reusableRequestDirCtx, bundle);
};

const writeReusableRequestDirFromBundle = async (
  reusableRequestDirCtx: ReusableRequestDirContext,
  reusableRequestDirBundle: ReusableRequestDirBundle,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));
  let backedUp = false;

  try {
    if (reusableRequestDirCtx.exists) {
      await fs.copy(reusableRequestDirCtx.abspath, backupDirPath);
      backedUp = true;
      await fs.emptyDir(reusableRequestDirCtx.abspath);
    }

    const promises = Object.entries(reusableRequestDirBundle).map(
      ([relpath, fileContent]) => {
        const filePath = path.resolve(reusableRequestDirCtx.abspath, relpath);

        return relpath === REUSABLE_REQUEST_JSON
          ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
          : fs.outputFile(filePath, (fileContent as string) ?? "");
      },
    );
    await Promise.all(promises);
  } catch (error) {
    if (reusableRequestDirCtx.exists && backedUp) {
      await fs.emptyDir(reusableRequestDirCtx.abspath);
      await fs.copy(backupDirPath, reusableRequestDirCtx.abspath);
    } else if (!reusableRequestDirCtx.exists) {
      await fs.remove(reusableRequestDirCtx.abspath);
    }

    throw error;
  } finally {
    await fs.remove(backupDirPath);
  }
};

const pruneReusableRequestsIndexDir = async (
  indexDirCtx: DirContext,
  remoteReusableRequests: ReusableRequestData<WithAnnotation>[],
): Promise<void> => {
  const reusableRequestsByKey = Object.fromEntries(
    remoteReusableRequests.map((reusableRequest) => [
      reusableRequest.key.toLowerCase(),
      reusableRequest,
    ]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });

  const promises = dirents.map(async (dirent) => {
    const direntPath = path.resolve(indexDirCtx.abspath, dirent.name);
    const direntKey = dirent.name.toLowerCase();

    if (
      (await isReusableRequestDir(direntPath)) &&
      reusableRequestsByKey[direntKey]
    ) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

/*
 * Writes fetched reusable requests into an index directory.
 */
export const writeReusableRequestsIndexDir = async (
  indexDirCtx: DirContext,
  remoteReusableRequests: ReusableRequestData<WithAnnotation>[],
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));
  let backedUp = false;

  try {
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      backedUp = true;
      await pruneReusableRequestsIndexDir(indexDirCtx, remoteReusableRequests);
    }

    const writePromises = remoteReusableRequests.map(
      async (reusableRequest) => {
        const reusableRequestDirPath = path.resolve(
          indexDirCtx.abspath,
          reusableRequest.key,
        );

        const reusableRequestDirCtx: ReusableRequestDirContext = {
          type: "reusable_request",
          key: reusableRequest.key,
          abspath: reusableRequestDirPath,
          exists: indexDirCtx.exists
            ? await isReusableRequestDir(reusableRequestDirPath)
            : false,
        };

        return writeReusableRequestDirFromData(
          reusableRequestDirCtx,
          reusableRequest,
        );
      },
    );

    await Promise.all(writePromises);
  } catch (error) {
    if (indexDirCtx.exists && backedUp) {
      await fs.emptyDir(indexDirCtx.abspath);
      await fs.copy(backupDirPath, indexDirCtx.abspath);
    } else if (!indexDirCtx.exists) {
      await fs.remove(indexDirCtx.abspath);
    }

    throw error;
  } finally {
    await fs.remove(backupDirPath);
  }
};

// Exported for the generator and tests.
export { pruneReusableRequestsIndexDir, writeReusableRequestDirFromBundle };
