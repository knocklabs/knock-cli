import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { TranslationDirContext } from "@/lib/run-context";

import { buildTranslationFileCtx, TranslationFileContext } from "./helpers";
import {
  DEFAULT_TRANSLATION_FORMAT,
  TranslationFormat,
} from "./processor.isomorphic";
import { TranslationData } from "./types";

// TODO: Extend and use this type everywhere rather than re-defining opts.
type WriteTranslationFileOpts = {
  format?: TranslationFormat;
};

/*
 * Write a single translation file.
 */
export const writeTranslationFile = async (
  translationFileCtx: TranslationFileContext,
  translation: TranslationData,
  options?: WriteTranslationFileOpts,
): Promise<void> => {
  const format = options?.format ?? DEFAULT_TRANSLATION_FORMAT;

  switch (format) {
    case "json":
      return fs.outputJson(
        translationFileCtx.abspath,
        JSON.parse(translation.content),
        {
          spaces: DOUBLE_SPACES,
        },
      );
    case "po":
      return fs.outputFile(translationFileCtx.abspath, translation.content);
    default:
      throw new Error(`Invalid translation file format: ${options?.format}`);
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
  options?: WriteTranslationFileOpts,
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
          {
            localeCode: translation.locale_code,
            namespace: translation.namespace,
          },
          options,
        );

        return writeTranslationFile(translationFileCtx, translation, options);
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
