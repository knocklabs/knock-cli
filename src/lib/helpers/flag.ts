import * as path from "node:path";

import { Flags } from "@oclif/core";
import * as fs from "fs-extra";
import { once } from "lodash";

import { DirContext } from "@/lib/helpers/fs";

import { readSlugFromBranchFile } from "./branch";
import { tryJsonParse } from "./json";
import { AnyObj } from "./object.isomorphic";
import { slugify } from "./string";

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
 * a file, if exists.
 */
export const filePath = Flags.custom<DirContext>({
  parse: async (input: string) => {
    const abspath = path.isAbsolute(input)
      ? input
      : path.resolve(process.cwd(), input);

    const exists = await fs.pathExists(abspath);
    if (exists && !(await fs.lstat(abspath)).isFile()) {
      throw new Error(`${input} exists but is not a file`);
    }

    return { abspath, exists };
  },
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

/*
 * Takes a flag input that's supposed to be a JSON string and validates it.
 */
export const jsonStr = Flags.custom<AnyObj>({
  parse: async (input: string) => {
    try {
      const data = JSON.parse(input);
      return data;
    } catch {
      throw new Error(`${input} is not a valid JSON string.`);
    }
  },
});

/*
 * Takes a flag input that can be a valid json or an arbitrary string,
 * tries parsing it before returning it.
 */
export const maybeJsonStr = Flags.custom<AnyObj | string>({
  parse: async (input: string) => {
    return tryJsonParse(input);
  },
});

/*
 * Takes a flag input that can be a valid json or an arbitrary comma separate-able string,
 * tries parsing the string then always returns the result as a list.
 */
export const maybeJsonStrAsList = Flags.custom<AnyObj[] | string[]>({
  parse: async (input: string) => {
    const data = tryJsonParse(input);
    if (typeof data === "string") return data.split(",");
    if (Array.isArray(data)) return data;
    return [data];
  },
});

const slug = Flags.custom<string>({
  parse: async (str) => {
    const slugifiedInput = slugify(str);

    if (!slugifiedInput) {
      throw new Error("Invalid slug provided");
    }

    return slugifiedInput;
  },
});

export const branch = slug({
  summary: "The slug of the branch to use.",
  // TODO Hide until branching is released in GA
  hidden: true,
  // Memoize this flag's default. oclif runs this default function even when the flag is unused.
  // Using lodash's once avoids unnecessarily reading the branch file multiple times.
  default: once(readSlugFromBranchFile),
});
