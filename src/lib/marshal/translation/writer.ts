import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { TranslationDirContext } from "@/lib/run-context";

import { buildTranslationFileCtx, TranslationFileContext } from "./helpers";
import { TranslationData } from "./types";

/*
 * Write a single translation file.
 */
export const writeTranslationFile = async (
  translationFileCtx: TranslationFileContext,
  translation: TranslationData,
  format: string | undefined,
): Promise<void> => {
  if (format === "po") {
    fs.outputFile(translationFileCtx.abspath, translation.content);
  } else {
    fs.outputJson(translationFileCtx.abspath, JSON.parse(translation.content), {
      spaces: DOUBLE_SPACES,
    });
  }
};

/*
 * The bulk write function that takes the fetched translations data from Knock
 * API and writes them into translation directories, grouped by their common
 * locale codes.
 */
export const writeTranslationFiles = async (
  targetDirCtx: TranslationDirContext | DirContext,
  translations: TranslationData[],
  format: string | undefined,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    // If the index directory already exists, back it up in the temp sandbox
    // before wiping it clean.
    if (targetDirCtx.exists) {
      await fs.copy(targetDirCtx.abspath, backupDirPath);
      await fs.emptyDir(targetDirCtx.abspath);
    }

    // Write given remote translations into the given translations directory path.
    const writeTranslationDirPromises = translations.map(
      async (translation) => {
        // If TranslationDirContext, then that is the locale directory we want
        // to write translation files in; otherwise for translations index
        // directory, we want to nest translation files under each locale dir.
        const localeDirPath =
          "key" in targetDirCtx
            ? targetDirCtx.abspath
            : path.resolve(targetDirCtx.abspath, translation.locale_code);

        const translationFileCtx = await buildTranslationFileCtx(
          localeDirPath,
          translation.locale_code,
          translation.namespace,
          format,
        );

        return writeTranslationFile(translationFileCtx, translation, format);
      },
    );

    await Promise.all(writeTranslationDirPromises);
  } catch (error) {
    // In case of any error, wipe the index directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (targetDirCtx.exists) {
      await fs.emptyDir(targetDirCtx.abspath);
      await fs.copy(backupDirPath, targetDirCtx.abspath);
    } else {
      await fs.remove(targetDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};
