import * as path from "node:path";

import * as fs from "fs-extra";

import { ReusableStepDirContext } from "@/lib/run-context";

import { REUSABLE_STEP_JSON } from "./processor.isomorphic";

export const reusableStepJsonPath = (
  reusableStepDirCtx: ReusableStepDirContext,
): string => path.resolve(reusableStepDirCtx.abspath, REUSABLE_STEP_JSON);

/*
 * Evaluates whether the given directory path is a reusable step directory, by
 * checking for the presence of a `reusable-step.json` file.
 */
export const isReusableStepDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsReusableStepJson(dirPath));

/*
 * Check for `reusable-step.json` file and return the file path if present.
 */
export const lsReusableStepJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const reusableStepJsonPath = path.resolve(dirPath, REUSABLE_STEP_JSON);

  const exists = await fs.pathExists(reusableStepJsonPath);
  return exists ? reusableStepJsonPath : undefined;
};
