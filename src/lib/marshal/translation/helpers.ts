import * as path from "node:path";

import localeData from "locale-codes";

/*
 * Evaluates whether the given directory path is a translations directory
 * by checking if the directory name is a valid locale name
 */
export const isTranslationsDir = (dirPath: string): boolean => {
  const locale = path.basename(dirPath);

  return Boolean(localeData.getByTag(locale));
};
