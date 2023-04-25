import * as path from "node:path";

import * as fs from "fs-extra";
import localeData from "locale-codes";

/*
 * Evaluates whether the given directory path is a translations directory
 * by checking if the directory name is a valid locale name
 */
export const isTranslationsDir = (dirPath: string): boolean => {
  const locale = path.basename(dirPath);

  return Boolean(localeData.getByTag(locale));
};

export type TranslationFileContext = {
  localeCode: string;
  namespace?: string | undefined;
  abspath: string;
  exists: boolean;
};

/*
 * Builds a translation file context that can be used
 * to determine the existence of the translation file,
 * its absolute path, and its identifiers.
 */
export const buildTranslationFileCtx = async (
  dirPath: string,
  localeCode: string,
  namespace: string | undefined,
): Promise<TranslationFileContext> => {
  const filename = namespace
    ? `${namespace}.${localeCode}.json`
    : `${localeCode}.json`;

  const abspath = path.resolve(dirPath, filename);
  const exists = await fs.pathExists(abspath);

  return {
    localeCode,
    namespace,
    abspath,
    exists,
  };
};
