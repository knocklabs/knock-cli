import * as path from "node:path";

import * as fs from "fs-extra";

export type DirContext = {
  abspath: string;
  exists: boolean;
};

/*
 * Check if a given file path is a directory.
 */
export const isDirectory = async (abspath: string): Promise<boolean> => {
  const exists = await fs.pathExists(abspath);

  return exists && (await fs.lstat(abspath)).isDirectory();
};

/**
 * Finds a file by recursively walking up the directory tree starting from the given directory.
 * @param currDir the directory to start searching from
 * @param fileName the name of the file to find
 * @returns the path to the file, or `undefined` if no file is found
 */
export const findFile = async (
  currDir: string,
  fileName: string,
): Promise<string | undefined> => {
  const filePath = path.resolve(currDir, fileName);
  const fileExists = await fs.pathExists(filePath);

  if (fileExists) {
    return filePath;
  }

  // If we reached the root of the filesystem, nothing more to do
  const { root } = path.parse(currDir);
  if (currDir === root) {
    return undefined;
  }

  // Keep walking up the directory tree
  const parentDir = path.resolve(currDir, "..");
  return findFile(parentDir, fileName);
};
