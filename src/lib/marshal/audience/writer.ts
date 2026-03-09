import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { AudienceDirContext } from "@/lib/run-context";

import { isAudienceDir } from "./helpers";
import {
  AUDIENCE_JSON,
  AudienceDirBundle,
  buildAudienceDirBundle,
} from "./processor.isomorphic";
import { readAudienceDir } from "./reader";
import { AudienceData } from "./types";

type WriteOpts = {
  withSchema?: boolean;
};

const AUDIENCE_SCHEMA = "https://schemas.knock.app/cli/audience.json";

/*
 * The main write function that takes the fetched audience data from Knock API
 * (remote audience), and reads the same audience from the local file system
 * (local audience, if available), then writes the remote audience into an
 * audience directory with the local audience as a reference.
 */
export const writeAudienceDirFromData = async (
  audienceDirCtx: AudienceDirContext,
  remoteAudience: AudienceData<WithAnnotation>,
  options?: WriteOpts,
): Promise<void> => {
  const { withSchema = false } = options || {};

  // If the audience directory exists on the file system (i.e. previously
  // pulled before), then read the audience file to use as a reference.
  const [localAudience] = audienceDirCtx.exists
    ? await readAudienceDir(audienceDirCtx)
    : [];

  const bundle = buildAudienceDirBundle(
    remoteAudience,
    localAudience,
    withSchema ? AUDIENCE_SCHEMA : undefined,
  );

  return writeAudienceDirFromBundle(audienceDirCtx, bundle);
};

/*
 * A lower level write function that takes a constructed audience dir bundle
 * and writes it into an audience directory on a local file system.
 *
 * It does not make any assumptions about how the audience directory bundle was
 * built; for example, it can be from parsing the audience data fetched from
 * the Knock API, or built manually for scaffolding purposes.
 */
const writeAudienceDirFromBundle = async (
  audienceDirCtx: AudienceDirContext,
  audienceDirBundle: AudienceDirBundle,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (audienceDirCtx.exists) {
      await fs.copy(audienceDirCtx.abspath, backupDirPath);
      await fs.emptyDir(audienceDirCtx.abspath);
    }

    const promises = Object.entries(audienceDirBundle).map(
      ([relpath, fileContent]) => {
        const filePath = path.resolve(audienceDirCtx.abspath, relpath);

        return relpath === AUDIENCE_JSON
          ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
          : fs.outputFile(filePath, (fileContent as string) ?? "");
      },
    );
    await Promise.all(promises);
  } catch (error) {
    // In case of any error, wipe the target directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (audienceDirCtx.exists) {
      await fs.emptyDir(audienceDirCtx.abspath);
      await fs.copy(backupDirPath, audienceDirCtx.abspath);
    } else {
      await fs.remove(audienceDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

/*
 * Prunes the index directory by removing any files, or directories that aren't
 * audience dirs found in fetched audiences. We want to preserve any audience
 * dirs that are going to be updated with remote audiences, so extracted links
 * can be respected.
 */
const pruneAudiencesIndexDir = async (
  indexDirCtx: DirContext,
  remoteAudiences: AudienceData<WithAnnotation>[],
): Promise<void> => {
  const audiencesByKey = Object.fromEntries(
    remoteAudiences.map((a) => [a.key.toLowerCase(), a]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });

  const promises = dirents.map(async (dirent) => {
    const direntName = dirent.name.toLowerCase();
    const direntPath = path.resolve(indexDirCtx.abspath, direntName);

    if ((await isAudienceDir(direntPath)) && audiencesByKey[direntName]) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

/*
 * The bulk write function that takes the fetched audiences data from Knock API
 * (remote audiences), and writes them into an audiences "index" directory by
 * referencing locally available audiences.
 */
export const writeAudiencesIndexDir = async (
  indexDirCtx: DirContext,
  remoteAudiences: AudienceData<WithAnnotation>[],
  options?: WriteOpts,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    // If the index directory already exists, back it up in the temp sandbox
    // before wiping it clean.
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await pruneAudiencesIndexDir(indexDirCtx, remoteAudiences);
    }

    // Write given remote audiences into the given audiences directory path.
    const writeAudienceDirPromises = remoteAudiences.map(async (audience) => {
      const audienceDirPath = path.resolve(indexDirCtx.abspath, audience.key);

      const audienceDirCtx: AudienceDirContext = {
        type: "audience",
        key: audience.key,
        abspath: audienceDirPath,
        exists: indexDirCtx.exists
          ? await isAudienceDir(audienceDirPath)
          : false,
      };

      return writeAudienceDirFromData(audienceDirCtx, audience, options);
    });

    await Promise.all(writeAudienceDirPromises);
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
export { pruneAudiencesIndexDir, writeAudienceDirFromBundle };
