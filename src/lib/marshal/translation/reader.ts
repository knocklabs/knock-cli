import * as path from "node:path";

import { CliUx } from "@oclif/core";
import * as fs from "fs-extra";

import { FoundError } from "@/lib/helpers/error";
import { readJson } from "@/lib/helpers/json";

import {
  isTranslationDir,
  lsTranslationDir,
  parseTranslationRef,
  TranslationCommandTarget,
  TranslationFileContext,
} from "./helpers";

export type TranslationFileData = TranslationFileContext & {
  content: string;
};

/*
 * For the given list of translation file paths, read each file and return
 * translation file data.
 *
 * Note, it assumes they are valid file paths to translation files.
 */
const readTranslationFiles = async (
  filePaths: string[],
): Promise<[TranslationFileData[], FoundError[]]> => {
  const translations: TranslationFileData[] = [];
  const errors: FoundError[] = [];

  for (const abspath of filePaths) {
    const { name: translationRef } = path.parse(abspath);
    const parsedRef = parseTranslationRef(translationRef)!;
    if (!parsedRef) continue;

    const { localeCode, namespace } = parsedRef;
    // eslint-disable-next-line no-await-in-loop
    const [content, readJsonErrors] = await readJson(abspath);

    if (readJsonErrors.length > 0) {
      const e = new FoundError(abspath, readJsonErrors);
      errors.push(e);
    }

    if (content) {
      translations.push({
        ref: translationRef,
        localeCode,
        namespace,
        abspath,
        exists: true,
        content: JSON.stringify(content),
      });
    }
  }

  return [translations, errors];
};

/*
 * List and read all translation files found for the given command target.
 *
 * Note, it assumes the valid command target.
 */
export const readTranslationFilesForCommandTarget = async (
  target: TranslationCommandTarget,
): Promise<[TranslationFileData[], FoundError[]]> => {
  const { type: targetType, context: targetCtx } = target;

  if (!targetCtx.exists) {
    return CliUx.ux.error(
      `Cannot locate translation file(s) at \`${targetCtx.abspath}\``,
    );
  }

  switch (targetType) {
    case "translationFile": {
      return readTranslationFiles([targetCtx.abspath]);
    }

    case "translationDir": {
      const translationFilePaths = await lsTranslationDir(targetCtx.abspath);
      return readTranslationFiles(translationFilePaths);
    }

    case "translationsIndexDir": {
      const dirents = await fs.readdir(targetCtx.abspath, {
        withFileTypes: true,
      });

      const translationDirPaths = dirents
        .filter(
          (dirent) => dirent.isDirectory() && isTranslationDir(dirent.name),
        )
        .map((dirent) => path.resolve(targetCtx.abspath, dirent.name));

      const translationFilePaths = (
        await Promise.all(
          translationDirPaths.map(async (abspath) => lsTranslationDir(abspath)),
        )
      ).flat();

      return readTranslationFiles(translationFilePaths);
    }

    default:
      throw new Error(`Invalid translation command target: ${target}`);
  }
};
