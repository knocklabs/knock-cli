import * as path from "node:path";

/**
 * Returns true if the argument looks like a filesystem path rather than a
 * resource key. Paths contain `/` or `\` or start with `.`.
 *
 * @param arg - The command argument to check
 * @returns True if the argument appears to be a path
 */
export const isPathArg = (arg: string): boolean =>
  arg.includes("/") || arg.includes("\\") || arg.startsWith(".");

/**
 * Resolves a path argument to an absolute path and extracts the resource key
 * from the directory basename.
 *
 * @param arg - The path argument to resolve
 * @returns Object with key (basename) and abspath (resolved path)
 */
export const resolvePathArg = (
  arg: string,
): { key: string; abspath: string } => {
  const abspath = path.resolve(arg);
  const key = path.basename(abspath);
  return { key, abspath };
};
