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

  return exists && (await fs.lstat(abspath)).isDirectory()
}
