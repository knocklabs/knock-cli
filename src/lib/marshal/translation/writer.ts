import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { TranslationDirContext } from "@/lib/run-context";

import { TranslationData } from "./types";

/*
 * This simply takes a remote translation and inserts its contents
 * into a file within the parent directory with its locale code. It adds the
 * namespace into the filename if one exists.
 */
export const writeTranslationDirFromData = async (
  translationDirCtx: TranslationDirContext,
  translation: TranslationData,
): Promise<void> => {
  const pathTermination = translation.namespace
    ? `${translation.namespace}.${translation.locale_code}.json`
    : `${translation.locale_code}.json`;

  const filePath = path.resolve(translationDirCtx.abspath, pathTermination);

  return fs.outputJson(filePath, translation.content, {
    spaces: DOUBLE_SPACES,
  });
};

/*
 * The bulk write function that takes the fetched translations data from Knock API
 * and writes them into a translations "index" directory
 */
export const writeTranslationsIndexDir = async (
  indexDirCtx: DirContext,
  translations: TranslationData[],
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    // If the index directory already exists, back it up in the temp sandbox
    // before wiping it clean.
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await fs.remove(indexDirCtx.abspath);
    }

    // Write given remote translations into the given translations directory path.
    const writeTranslationDirPromises = translations.map(
      async (translation) => {
        const translationDirPath = path.resolve(
          indexDirCtx.abspath,
          translation.locale_code,
        );

        const translationDirCtx: TranslationDirContext = {
          type: "translation",
          key: translation.locale_code,
          abspath: translationDirPath,
          exists: false,
        };

        return writeTranslationDirFromData(translationDirCtx, translation);
      },
    );

    await Promise.all(writeTranslationDirPromises);
  } catch (error) {
    // In case of any error, wipe the index directory that is likely in a bad
    // state then restore the backup if one existed before.
    await fs.remove(indexDirCtx.abspath);
    if (indexDirCtx.exists) {
      await fs.copy(backupDirPath, indexDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};
