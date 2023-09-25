import * as fs from "fs-extra";

import { DOUBLE_SPACES } from "@/lib/helpers/json";

import { EmailLayoutData } from "./types";

/*
 * Write a single email layout file.
 */
export const writeEmailLayoutFile = async (
  emailLayoutFilePath: string,
  emailLayout: EmailLayoutData,
): Promise<void> =>
  fs.outputJson(emailLayoutFilePath, JSON.parse(emailLayout.html_layout), {
    spaces: DOUBLE_SPACES,
  });
