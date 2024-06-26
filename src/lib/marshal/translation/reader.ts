import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { formatErrors, SourceError } from "@/lib/helpers/error";
import { readJson } from "@/lib/helpers/json";

import {
  isTranslationDir,
  lsTranslationDir,
  parseTranslationRef,
  SYSTEM_NAMESPACE,
  TranslationCommandTarget,
  TranslationFileContext,
} from "./helpers";
import {
  SUPPORTED_TRANSLATION_FORMATS,
  TranslationFormat,
} from "./processor.isomorphic";

// Hydrated translation file context with its content.
export type TranslationFileData = TranslationFileContext & {
  content: string;
  format: TranslationFormat;
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

    // Skip the system translation file when reading from the disk by default,
    // as it is not user editable and should be excluded from the validate or
    // push commands. Consider making this an option in the future.
    if (namespace === SYSTEM_NAMESPACE) continue;

    // eslint-disable-next-line no-await-in-loop
    const [content, sourceError, format] = await readTranslationFile(abspath);
    if (sourceError) {
      errors.push(sourceError);
      continue;
    }

    translations.push({
      ref: translationRef,
      localeCode,
      namespace,
      abspath,
      exists: true,
      content,
      format,
    });
  }

  return [translations, errors];
};

const readTranslationFile = async (
  filePath: string,
): Promise<
  | [string, undefined, TranslationFormat]
  | [undefined, SourceError, TranslationFormat]
> => {
  // Get translation format from file extension
  const format = getFormatFromFilePath(filePath);

  switch (format) {
    case "json": {
      const [jsonContent, readErrors] = await readJson(filePath);

      if (readErrors.length > 0) {
        const e = new SourceError(formatErrors(readErrors), filePath);
        return [undefined, e, format];
      }

      const content = JSON.stringify(jsonContent);

      return [content, undefined, format];
    }

    case "po": {
      try {
        const content = await fs.readFile(filePath, "utf8");
        return [content, undefined, format];
      } catch (error) {
        const e = new SourceError((error as Error).message, filePath);
        return [undefined, e, format];
      }
    }

    default:
      throw new Error(`unsupported translation file extension: ${filePath}`);
  }
};

const getFormatFromFilePath = (
  filePath: string,
): TranslationFormat | undefined => {
  // Path.extname returns the extension with a period (e.g. .json)
  // so we use slice to get just the name
  const extension = path.extname(filePath).slice(1);

  return SUPPORTED_TRANSLATION_FORMATS.includes(extension as TranslationFormat)
    ? (extension as TranslationFormat)
    : undefined;
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
