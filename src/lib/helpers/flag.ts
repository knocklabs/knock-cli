import * as path from "node:path";

import { Flags } from "@oclif/core";
import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";

/*
 * Takes a flag input of 'true' or 'false' as a string, then cast to a boolean
 * value when parsing.
 *
 * Note, this differs from oclif's built-in Flags.boolean() which is a flag that
 * takes no value (and is reversed with a `--no-*` variant).
 */
export const booleanStr = Flags.custom<boolean>({
  options: ["true", "false"],
  parse: async (input: string) => input === "true",
});

/*
 * Takes a relative or absolute path as an input, then parses it into an
 * absolute path. Checks if the path exists or not, and validates that it is
 * a directory, if exists.
 */
export const dirPath = Flags.custom<DirContext>({
  parse: async (input: string) => {
    const abspath = path.isAbsolute(input)
      ? input
      : path.resolve(process.cwd(), input);

    const exists = await fs.pathExists(abspath);
    if (exists && !(await fs.lstat(abspath)).isDirectory()) {
      throw new Error(`${input} exists but is not a directory`);
    }

    return { abspath, exists };
  },
});
