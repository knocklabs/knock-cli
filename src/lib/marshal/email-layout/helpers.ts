import * as path from "node:path";

import * as fs from "fs-extra";

export const LAYOUT_JSON = "layout.json";

export type EmailLayoutFileContext = {
  key: string;
  abspath: string;
  exists: boolean;
};

/*
 * Evaluates whether the given directory path is an email layout directory, by
 * checking for the presence of a `layout.json` file.
 */
export const isEmailLayoutDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await isEmailLayoutJson(dirPath));

/*
 * Check for `layout.json` file and return the file path if present.
 */

export const isEmailLayoutJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const emailLayoutJsonPath = path.resolve(dirPath, LAYOUT_JSON);

  const exists = await fs.pathExists(emailLayoutJsonPath);
  return exists ? emailLayoutJsonPath : undefined;
};
