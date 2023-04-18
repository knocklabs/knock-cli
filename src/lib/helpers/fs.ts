export type DirContext = {
  abspath: string;
  exists: boolean;
};

/*
 * Check if a given file path is a directory.
 */
// export const isDirectory = async (filePath: string): Promise<boolean> => {
//   const exists = await fs.pathExists(filePath);
//
//   return exists && (await fs.lstat(filePath)).isDirectory()
// }
