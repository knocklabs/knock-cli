import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { PartialDirContext } from "@/lib/run-context";

import { isPartialDir } from "./helpers";
import {
  buildPartialDirBundle,
  PARTIAL_JSON,
  PartialDirBundle,
} from "./processor.isomorphic";
import { readPartialDir } from "./reader";
import { PartialData } from "./types";

type WriteOpts = {
  withSchema?: boolean;
};

const PARTIAL_SCHEMA = "https://schemas.knock.app/cli/partial.json";

/*
 * The main write function that takes the fetched partial data from Knock API
 * (remote partial), and reads the same partial from the local file system
 * (local partial, if available), then writes the remote partial into a
 * partial directory with the local partial as a reference.
 */
export const writePartialDirFromData = async (
  partialDirCtx: PartialDirContext,
  remotePartial: PartialData<WithAnnotation>,
  options?: WriteOpts,
): Promise<void> => {
  const { withSchema = false } = options || {};

  // If the partial directory exists on the file system (i.e. previously
  // pulled before), then read the partial file to use as a reference.
  const [localPartial] = partialDirCtx.exists
    ? await readPartialDir(partialDirCtx, { withExtractedFiles: true })
    : [];

  const bundle = buildPartialDirBundle(
    remotePartial,
    localPartial,
    withSchema ? PARTIAL_SCHEMA : undefined,
  );

  return writePartialDirFromBundle(partialDirCtx, bundle);
};

/*
 * A lower level write function that takes a constructed partial dir bundle
 * and writes it into a partial directory on a local file system.
 *
 * It does not make any assumptions about how the partial directory bundle was
 * built; for example, it can be from parsing the partial data fetched from
 * the Knock API, or built manually for scaffolding purposes.
 */
const writePartialDirFromBundle = async (
  partialDirCtx: PartialDirContext,
  partialDirBundle: PartialDirBundle,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (partialDirCtx.exists) {
      await fs.copy(partialDirCtx.abspath, backupDirPath);
      await fs.emptyDir(partialDirCtx.abspath);
    }

    const promises = Object.entries(partialDirBundle).map(
      ([relpath, fileContent]) => {
        const filePath = path.resolve(partialDirCtx.abspath, relpath);

        return relpath === PARTIAL_JSON
          ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
          : fs.outputFile(filePath, fileContent ?? "");
      },
    );
    await Promise.all(promises);
  } catch (error) {
    // In case of any error, wipe the target directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (partialDirCtx.exists) {
      await fs.emptyDir(partialDirCtx.abspath);
      await fs.copy(backupDirPath, partialDirCtx.abspath);
    } else {
      await fs.remove(partialDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

/*
 * Prunes the index directory by removing any files, or directories that aren't
 * partial dirs found in fetched partials. We want to preserve any partial
 * dirs that are going to be updated with remote partials, so extracted links
 * can be respected.
 */
const prunePartialsIndexDir = async (
  indexDirCtx: DirContext,
  remotePartials: PartialData<WithAnnotation>[],
): Promise<void> => {
  const partialsByKey = Object.fromEntries(
    remotePartials.map((w) => [w.key.toLowerCase(), w]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });

  const promises = dirents.map(async (dirent) => {
    const direntName = dirent.name.toLowerCase();
    const direntPath = path.resolve(indexDirCtx.abspath, direntName);

    if ((await isPartialDir(direntPath)) && partialsByKey[direntName]) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

/*
 * The bulk write function that takes the fetched partials data from Knock API
 * (remote partials), and writes them into a partials "index" directory by
 * referencing locally available partials.
 */
export const writePartialsIndexDir = async (
  indexDirCtx: DirContext,
  remotePartials: PartialData<WithAnnotation>[],
  options?: WriteOpts,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    // If the index directory already exists, back it up in the temp sandbox
    // before wiping it clean.
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await prunePartialsIndexDir(indexDirCtx, remotePartials);
    }

    // Write given remote partials into the given partials directory path.
    const writePartialDirPromises = remotePartials.map(async (partial) => {
      const partialDirPath = path.resolve(indexDirCtx.abspath, partial.key);

      const partialDirCtx: PartialDirContext = {
        type: "partial",
        key: partial.key,
        abspath: partialDirPath,
        exists: indexDirCtx.exists ? await isPartialDir(partialDirPath) : false,
      };

      return writePartialDirFromData(partialDirCtx, partial, options);
    });

    await Promise.all(writePartialDirPromises);
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
export { prunePartialsIndexDir };
