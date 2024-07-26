import * as path from "node:path";

import * as fs from "fs-extra";

import { PARTIAL_JSON } from "./processor.isomorphic";

/*
 * Check for partial.json file and return the file path if present.
 */
export const lsPartialJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const partialJsonPath = path.resolve(dirPath, PARTIAL_JSON);

  const exists = await fs.pathExists(partialJsonPath);
  return exists ? partialJsonPath : undefined;
};

/*
 * Evaluates whether the given directory path is a partial directory, by
 * checking for the presence of partial.json file.
 */
export const isPartialDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsPartialJson(dirPath));
