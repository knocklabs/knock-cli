import path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { EmailLayoutDirContext } from "@/lib/run-context";

import { isEmailLayoutDir } from "./helpers";
import { readEmailLayoutDir } from "./reader";
import { EmailLayoutData } from "./types";
import { buildEmailLayoutDirBundle, LAYOUT_JSON } from "./processor.isomorphic";

/*
 * Builds an email layout dir bundle, which consist of the email layout JSON +
 * the extractable files.  Then writes them into a layout directory on a local
 * file system.
 */
export const writeEmailLayoutDirFromData = async (
  emailLayoutDirCtx: EmailLayoutDirContext,
  remoteEmailLayout: EmailLayoutData<WithAnnotation>,
): Promise<void> => {
  // If the layout directory exists on the file system (i.e. previously
  // pulled before), then read the layout file to use as a reference.
  const [localEmailLayout] = emailLayoutDirCtx.exists
    ? await readEmailLayoutDir(emailLayoutDirCtx, { withExtractedFiles: true })
    : [];

  const bundle = buildEmailLayoutDirBundle(remoteEmailLayout, localEmailLayout);

  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));
  try {
    // We store a backup in case there's an error.
    if (emailLayoutDirCtx.exists) {
      await fs.copy(emailLayoutDirCtx.abspath, backupDirPath);
      await fs.emptyDir(emailLayoutDirCtx.abspath);
    }

    const promises = Object.entries(bundle).map(([relpath, fileContent]) => {
      const filePath = path.resolve(emailLayoutDirCtx.abspath, relpath);

      return relpath === LAYOUT_JSON
        ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
        : fs.outputFile(filePath, fileContent);
    });

    await Promise.all(promises);
  } catch (error) {
    // In case of any error, wipe the target directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (emailLayoutDirCtx.exists) {
      await fs.emptyDir(emailLayoutDirCtx.abspath);
      await fs.copy(backupDirPath, emailLayoutDirCtx.abspath);
    } else {
      await fs.remove(emailLayoutDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

/*
 * This bulk write function takes the fetched email layouts data KNOCK API and
 * writes them into a layouts "index" directory.
 */
export const writeEmailLayoutIndexDir = async (
  indexDirCtx: DirContext,
  remoteEmailLayouts: EmailLayoutData<WithAnnotation>[],
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await pruneLayoutsIndexDir(indexDirCtx, remoteEmailLayouts);
    }

    const writeEmailLayoutDirPromises = remoteEmailLayouts.map(
      async (remoteEmailLayout) => {
        const emailLayoutDirPath = path.resolve(
          indexDirCtx.abspath,
          remoteEmailLayout.key,
        );

        const emailLayoutDirCtx: EmailLayoutDirContext = {
          type: "email_layout",
          key: remoteEmailLayout.key,
          abspath: emailLayoutDirPath,
          exists: indexDirCtx.exists
            ? await isEmailLayoutDir(emailLayoutDirPath)
            : false,
        };

        return writeEmailLayoutDirFromData(
          emailLayoutDirCtx,
          remoteEmailLayout,
        );
      },
    );

    await Promise.all(writeEmailLayoutDirPromises);
  } catch (error) {
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

/*
 * Prunes the index directory by removing any files, or directories that aren't
 * layout dirs found in fetched layouts. We want to preserve any layout
 * dirs that are going to be updated with remote layouts, so extracted links
 * can be respected.
 */
const pruneLayoutsIndexDir = async (
  indexDirCtx: DirContext,
  remoteEmailLayouts: EmailLayoutData<WithAnnotation>[],
): Promise<void> => {
  const emailLayoutsByKey = Object.fromEntries(
    remoteEmailLayouts.map((e) => [e.key.toLowerCase(), e]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });
  const promises = dirents.map(async (dirent) => {
    const direntName = dirent.name.toLowerCase();
    const direntPath = path.resolve(indexDirCtx.abspath, direntName);

    if ((await isEmailLayoutDir(direntPath)) && emailLayoutsByKey[direntName]) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

// Exported for tests
export { pruneLayoutsIndexDir };
