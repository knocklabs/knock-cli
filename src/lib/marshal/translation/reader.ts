import * as path from "node:path";
import { CliUx } from "@oclif/core";
import * as fs from "fs-extra";

import { readJson } from "@/lib/helpers/json";
import { FoundError } from "@/lib/helpers/error";

import { TranslationFileContext, TranslationCommandTarget, lsTranslationDir, parseTranslationRef } from "./helpers"

type TranslationFileData = TranslationFileContext & {
  content: string;
}

/*
 * XXX: Assumes the valid translation file paths.
 */
const readTranslationFiles = async (filePaths: string[]): Promise<[TranslationFileData[], FoundError[]]> => {
  const translations: TranslationFileData[] = [];
  const errors: FoundError[] = [];

  for (const abspath of filePaths) {
    const { name: translationRef } = path.parse(abspath);
    const parsedRef = parseTranslationRef(translationRef)!;
    if (!parsedRef) continue;

    const { localeCode, namespace } = parsedRef;
    const [content, readJsonErrors] = await readJson(abspath);

    if (readJsonErrors.length > 0) {
      const e = new FoundError(abspath, readJsonErrors);
      errors.push(e)
    }

    if (content) {
      translations.push({
        localeCode,
        namespace,
        abspath,
        exists: true,
        content: JSON.stringify(content),
      })
    }
  }

  return [translations, errors];
}

/*
 * XXX: Assumes a valid command target
 */
export const readTranslationFilesForTarget = async (
  target: TranslationCommandTarget
): Promise<[TranslationFileData[], FoundError[]]> => {
  const [targetEntry] = Object.entries(target)
  if (!targetEntry) {
    throw new Error(`Invalid translation command target: ${target}`);
  }

  const [targetType, targetCtx] = targetEntry;

  if (!targetCtx.exists) {
    return CliUx.ux.error(
      `Cannot locate translation file(s) at \`${targetCtx.abspath}\``,
    );
  }

  switch (targetType) {
    case 'translationFile': {
      return readTranslationFiles([targetCtx.abspath])
    }

    case 'translationDir': {
      const translationFilePaths = await lsTranslationDir(targetCtx.abspath)
      return readTranslationFiles(translationFilePaths)
    }

    case 'translationsIndexDir': {
      const dirents = await fs.readdir(targetCtx.abspath, { withFileTypes: true });

      const translationDirPaths = dirents
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.resolve(targetCtx.abspath, dirent.name))

      const translationFilePaths = (await Promise.all(
        translationDirPaths.map(async (abspath) => await lsTranslationDir(abspath))
      )).flat()

      return readTranslationFiles(translationFilePaths);
    }

    default:
      throw new Error(`Invalid translation command target: ${target}`);
  }
}
