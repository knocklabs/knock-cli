import * as fs from "fs-extra";

import { DOUBLE_SPACES } from "@/lib/helpers/json";

import { EmailLayoutData } from "./types";

/*
 * Write a single email layout file in a given path.
 */

export const writeEmailLayoutFile = async (
  emailLayoutAbsPath: string,
  emailLayout: EmailLayoutData,
): Promise<void> =>
  fs.outputJson(emailLayoutAbsPath, emailLayout, {
    spaces: DOUBLE_SPACES,
  });
