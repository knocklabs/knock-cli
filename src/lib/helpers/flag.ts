import { Flags } from "@oclif/core";

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
