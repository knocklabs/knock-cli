import { Args } from "@oclif/core";

const slugArg = Args.custom<string>({
  parse: async (str) => {
    const slug = str.toLowerCase().trim().replace(/\s+/g, "-");

    if (!slug) {
      throw new Error("Invalid slug provided");
    }

    return slug;
  },
});

export const CustomArgs = { slugArg };
