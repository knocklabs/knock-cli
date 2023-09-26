import * as path from "node:path";

import * as fs from "fs-extra";

export type EmailLayoutFileContext = {
  key: string;
  abspath: string;
  exists: boolean;
};

/*
 * Evaluates whether the given directory path is an email layout directory, by
 * checking for the presence of `${email_layout_key}.json` file.
 */
export const isEmailLayoutDir = async (
  dirPath: string,
  emailLayoutJson: string,
): Promise<boolean> =>
  Boolean(await isEmailLayoutJson(dirPath, emailLayoutJson));

/*
 * Check for the existance of`${email_layout_key}.json` file in the directory.
 */

export const isEmailLayoutJson = async (
  dirPath: string,
  emailLayoutJson: string,
): Promise<string | undefined> => {
  const emailLayoutJsonPath = path.resolve(dirPath, emailLayoutJson);

  const exists = await fs.pathExists(emailLayoutJsonPath);
  return exists ? emailLayoutJsonPath : undefined;
};
