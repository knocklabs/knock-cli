import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { ReusableStepDirContext } from "@/lib/run-context";

import { isReusableStepDir } from "./helpers";
import {
  buildReusableStepDirBundle,
  REUSABLE_STEP_JSON,
  ReusableStepDirBundle,
} from "./processor.isomorphic";
import { readReusableStepDir } from "./reader";
import { ReusableStepData } from "./types";

/*
 * The main write function that takes the fetched reusable step data from Knock API
 * (remote reusable step), and reads the same reusable step from the local file system
 * (local reusable step, if available), then writes the remote reusable step into a
 * reusable step directory with the local reusable step as a reference.
 */
export const writeReusableStepDirFromData = async (
  reusableStepDirCtx: ReusableStepDirContext,
  remoteReusableStep: ReusableStepData<WithAnnotation>,
): Promise<void> => {
  // If the reusable step directory exists on the file system (i.e. previously
  // pulled before), then read the reusable step file to use as a reference.
  const [localReusableStep] = reusableStepDirCtx.exists
    ? await readReusableStepDir(reusableStepDirCtx, {
        withExtractedFiles: true,
      })
    : [];

  const bundle = buildReusableStepDirBundle(
    remoteReusableStep,
    localReusableStep,
  );

  return writeReusableStepDirFromBundle(reusableStepDirCtx, bundle);
};

/*
 * A lower level write function that takes a constructed reusable step dir bundle
 * and writes it into a reusable step directory on a local file system.
 *
 * It does not make any assumptions about how the reusable step directory bundle was
 * built; for example, it can be from parsing the reusable step data fetched from
 * the Knock API, or built manually for scaffolding purposes.
 */
const writeReusableStepDirFromBundle = async (
  reusableStepDirCtx: ReusableStepDirContext,
  reusableStepDirBundle: ReusableStepDirBundle,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (reusableStepDirCtx.exists) {
      await fs.copy(reusableStepDirCtx.abspath, backupDirPath);
      await fs.emptyDir(reusableStepDirCtx.abspath);
    }

    const promises = Object.entries(reusableStepDirBundle).map(
      ([relpath, fileContent]) => {
        const filePath = path.resolve(reusableStepDirCtx.abspath, relpath);

        return relpath === REUSABLE_STEP_JSON
          ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
          : fs.outputFile(filePath, fileContent ?? "");
      },
    );
    await Promise.all(promises);
  } catch (error) {
    // In case of any error, wipe the target directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (reusableStepDirCtx.exists) {
      await fs.emptyDir(reusableStepDirCtx.abspath);
      await fs.copy(backupDirPath, reusableStepDirCtx.abspath);
    } else {
      await fs.remove(reusableStepDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

/*
 * Prunes the index directory by removing any files, or directories that aren't
 * reusable step dirs found in fetched reusable steps. We want to preserve any reusable step
 * dirs that are going to be updated with remote reusable steps, so extracted links
 * can be respected.
 */
const pruneReusableStepsIndexDir = async (
  indexDirCtx: DirContext,
  remoteReusableSteps: ReusableStepData<WithAnnotation>[],
): Promise<void> => {
  const reusableStepsByKey = Object.fromEntries(
    remoteReusableSteps.map((w) => [w.key.toLowerCase(), w]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });

  const promises = dirents.map(async (dirent) => {
    const direntName = dirent.name.toLowerCase();
    const direntPath = path.resolve(indexDirCtx.abspath, direntName);

    if (
      (await isReusableStepDir(direntPath)) &&
      reusableStepsByKey[direntName]
    ) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

/*
 * The bulk write function that takes the fetched reusable steps data from Knock API
 * (remote reusable steps), and writes them into a reusable steps "index" directory by
 * referencing locally available reusable steps.
 */
export const writeReusableStepsIndexDir = async (
  indexDirCtx: DirContext,
  remoteReusableSteps: ReusableStepData<WithAnnotation>[],
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    // If the index directory already exists, back it up in the temp sandbox
    // before wiping it clean.
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await pruneReusableStepsIndexDir(indexDirCtx, remoteReusableSteps);
    }

    // Write given remote reusable steps into the given reusable steps directory path.
    const writeReusableStepDirPromises = remoteReusableSteps.map(
      async (reusableStep) => {
        const reusableStepDirPath = path.resolve(
          indexDirCtx.abspath,
          reusableStep.key,
        );

        const reusableStepDirCtx: ReusableStepDirContext = {
          type: "reusable_step",
          key: reusableStep.key,
          abspath: reusableStepDirPath,
          exists: indexDirCtx.exists
            ? await isReusableStepDir(reusableStepDirPath)
            : false,
        };

        return writeReusableStepDirFromData(reusableStepDirCtx, reusableStep);
      },
    );

    await Promise.all(writeReusableStepDirPromises);
  } catch (error) {
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
export { pruneReusableStepsIndexDir };
