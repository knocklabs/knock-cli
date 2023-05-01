import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";

import { buildTranslationFileCtx } from "./helpers";
import { TranslationData } from "./types";

/*
 * The bulk write function that takes the fetched translations data from Knock API
 * and writes them into translation directories, grouped by their common locale codes.
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
      await fs.emptyDir(indexDirCtx.abspath);
    }

    // Write given remote translations into the given translations directory path.
    const writeTranslationDirPromises = translations.map(
      async (translation) => {
        const translationDirPath = path.resolve(
          indexDirCtx.abspath,
          translation.locale_code,
        );

        const translationFileCtx = await buildTranslationFileCtx(
          translationDirPath,
          translation.locale_code,
          translation.namespace,
        );

        return fs.outputJson(
          translationFileCtx.abspath,
          JSON.parse(translation.content),
          {
            spaces: DOUBLE_SPACES,
          },
        );
      },
    );

    await Promise.all(writeTranslationDirPromises);
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
