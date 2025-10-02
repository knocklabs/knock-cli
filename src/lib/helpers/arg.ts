import { Args } from "@oclif/core";

import { slugify } from "./string";

const slug = Args.custom<string>({
  parse: async (str) => {
    const slugifiedInput = slugify(str);

    if (!slugifiedInput) {
      throw new Error("Invalid slug provided");
    }

    return slugifiedInput;
  },
});

export const CustomArgs = { slug };
