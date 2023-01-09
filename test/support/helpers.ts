import * as path from "node:path";

/*
 * Create sequences for generating unique values, like ExMachina's sequence/1.
 */
const SEQ_COUNTER: Record<string, number> = {};

export const sequence = (name: string): string => {
  name in SEQ_COUNTER ? SEQ_COUNTER[name]++ : (SEQ_COUNTER[name] = 0);

  return `${name}${SEQ_COUNTER[name]}`;
};

/*
 * Takes a posix-style path string, then translates it to a cross platform path
 * string for convenience when writing tests.
 */
export const xpath = (pathStr: string): string => {
  const parts = pathStr.split("/");

  return path.isAbsolute(pathStr)
    ? path.resolve("/", ...parts)
    : path.join(...parts);
};
