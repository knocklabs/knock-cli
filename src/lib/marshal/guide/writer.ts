import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { GuideDirContext } from "@/lib/run-context";

import { isGuideDir } from "./helpers";
import {
  buildGuideDirBundle,
  GUIDE_JSON,
  GuideDirBundle,
} from "./processor.isomorphic";
import { readGuideDir } from "./reader";
import { GuideData } from "./types";

type WriteOpts = {
  withSchema?: boolean;
};

const GUIDE_SCHEMA = "https://schemas.knock.app/cli/guide.json";

/*
 * The main write function that takes the fetched guide data from Knock API
 * (remote guide), and reads the same guide from the local file system
 * (local guide, if available), then writes the remote guide into a
 * guide directory with the local guide as a reference.
 */
export const writeGuideDirFromData = async (
  guideDirCtx: GuideDirContext,
  remoteGuide: GuideData<WithAnnotation>,
  options?: WriteOpts,
): Promise<void> => {
  const { withSchema = false } = options || {};

  // If the guide directory exists on the file system (i.e. previously
  // pulled before), then read the guide file to use as a reference.
  const [localGuide] = guideDirCtx.exists
    ? await readGuideDir(guideDirCtx, { withExtractedFiles: true })
    : [];

  const bundle = buildGuideDirBundle(
    remoteGuide,
    localGuide,
    withSchema ? GUIDE_SCHEMA : undefined,
  );

  return writeGuideDirFromBundle(guideDirCtx, bundle);
};

/*
 * A lower level write function that takes a constructed guide dir bundle
 * and writes it into a guide directory on a local file system.
 *
 * It does not make any assumptions about how the guide directory bundle was
 * built; for example, it can be from parsing the guide data fetched from
 * the Knock API, or built manually for scaffolding purposes.
 */
const writeGuideDirFromBundle = async (
  guideDirCtx: GuideDirContext,
  guideDirBundle: GuideDirBundle,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (guideDirCtx.exists) {
      await fs.copy(guideDirCtx.abspath, backupDirPath);
      await fs.emptyDir(guideDirCtx.abspath);
    }

    const promises = Object.entries(guideDirBundle).map(
      ([relpath, fileContent]) => {
        const filePath = path.resolve(guideDirCtx.abspath, relpath);

        return relpath === GUIDE_JSON
          ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
          : fs.outputFile(filePath, fileContent ?? "");
      },
    );
    await Promise.all(promises);
  } catch (error) {
    // In case of any error, wipe the target directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (guideDirCtx.exists) {
      await fs.emptyDir(guideDirCtx.abspath);
      await fs.copy(backupDirPath, guideDirCtx.abspath);
    } else {
      await fs.remove(guideDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

/*
 * Prunes the index directory by removing any files, or directories that aren't
 * guide dirs found in fetched guides. We want to preserve any guide
 * dirs that are going to be updated with remote guides, so extracted links
 * can be respected.
 */
const pruneGuidesIndexDir = async (
  indexDirCtx: DirContext,
  remoteGuides: GuideData<WithAnnotation>[],
): Promise<void> => {
  const guidesByKey = Object.fromEntries(
    remoteGuides.map((w) => [w.key.toLowerCase(), w]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });

  const promises = dirents.map(async (dirent) => {
    const direntName = dirent.name.toLowerCase();
    const direntPath = path.resolve(indexDirCtx.abspath, direntName);

    if ((await isGuideDir(direntPath)) && guidesByKey[direntName]) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

/*
 * The bulk write function that takes the fetched guides data from Knock API
 * (remote guides), and writes them into a guides "index" directory by
 * referencing locally available guides.
 */
export const writeGuidesIndexDir = async (
  indexDirCtx: DirContext,
  remoteGuides: GuideData<WithAnnotation>[],
  options?: WriteOpts,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    // If the index directory already exists, back it up in the temp sandbox
    // before wiping it clean.
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await pruneGuidesIndexDir(indexDirCtx, remoteGuides);
    }

    // Write given remote guides into the given guides directory path.
    const writeGuideDirPromises = remoteGuides.map(async (guide) => {
      const guideDirPath = path.resolve(indexDirCtx.abspath, guide.key);

      const guideDirCtx: GuideDirContext = {
        type: "guide",
        key: guide.key,
        abspath: guideDirPath,
        exists: indexDirCtx.exists ? await isGuideDir(guideDirPath) : false,
      };

      return writeGuideDirFromData(guideDirCtx, guide, options);
    });

    await Promise.all(writeGuideDirPromises);
  } catch (error) {
    console.log(error);
    // In case of any error, wipe the index directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (indexDirCtx.exists) {
      await fs.emptyDir(indexDirCtx.abspath);
      await fs.copy(backupDirPath, indexDirCtx.abspath);
    } else {
      await fs.remove(indexDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

// Exported for tests.
export { pruneGuidesIndexDir };
