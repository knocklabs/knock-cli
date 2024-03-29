import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { formatErrors, SourceError } from "@/lib/helpers/error";
import { readJson } from "@/lib/helpers/json";

import {
  isTranslationDir,
  lsTranslationDir,
  parseTranslationRef,
  TranslationCommandTarget,
  TranslationFileContext,
} from "./helpers";

// Hydrated translation file context with its content.
export type TranslationFileData = TranslationFileContext & {
  content: string;
};

/*
 * For the given list of translation file paths, read each file and return
 * translation file data.
 *
 * Note, it assumes they are valid file paths to translation files.
 *
 * TODO: Refactor to take translation file contexts instead of raw file paths,
 * to keep things consistent with the workflow reader module.
 */
const readTranslationFiles = async (
  filePaths: string[],
): Promise<[TranslationFileData[], SourceError[]]> => {
  const translations: TranslationFileData[] = [];
  const errors: SourceError[] = [];

  for (const abspath of filePaths) {
    const { name: translationRef } = path.parse(abspath);
    const parsedRef = parseTranslationRef(translationRef)!;
    if (!parsedRef) continue;

    const { localeCode, namespace } = parsedRef;
    // eslint-disable-next-line no-await-in-loop
    const [content, readJsonErrors] = await readJson(abspath);

    if (readJsonErrors.length > 0) {
      const e = new SourceError(formatErrors(readJsonErrors), abspath);
      errors.push(e);
      continue;
    }

    translations.push({
      ref: translationRef,
      localeCode,
      namespace,
      abspath,
      exists: true,
      content: JSON.stringify(content),
    });
  }

  return [translations, errors];
};

/*
 * List and read all translation files found for the given command target.
 *
 * Note, it assumes the valid command target.
 */
export const readAllForCommandTarget = async (
  target: TranslationCommandTarget,
): Promise<[TranslationFileData[], SourceError[]]> => {
  const { type: targetType, context: targetCtx } = target;

  if (!targetCtx.exists) {
    const subject =
      targetType === "translationFile"
        ? "a translation file at"
        : "translation files in";

    return ux.error(`Cannot locate ${subject} \`${targetCtx.abspath}\``);
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
