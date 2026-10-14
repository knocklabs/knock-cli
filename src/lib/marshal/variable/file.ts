import * as path from "node:path";

import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import { ProjectConfig, resolveKnockDir } from "@/lib/helpers/project-config";

import { VariableEntry, VariablesFile } from "./types";

export const VARIABLES_FILENAME = "variables.json";

export type VariablesFileContext = {
  abspath: string;
  exists: boolean;
};

export const resolveVariablesFile = async (
  projectConfig: ProjectConfig | undefined,
  knockDirFlag: DirContext | undefined,
  cwd: string,
): Promise<VariablesFileContext> => {
  const knockDir = await resolveKnockDir(knockDirFlag, projectConfig);
  const abspath = knockDir
    ? path.join(knockDir.abspath, VARIABLES_FILENAME)
    : path.resolve(cwd, VARIABLES_FILENAME);
  const exists = await fs.pathExists(abspath);

  return { abspath, exists };
};

export const readVariablesFile = async (
  abspath: string,
): Promise<VariablesFile> => {
  let raw: string;
  try {
    raw = await fs.readFile(abspath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`No variables file at ${abspath}.`);
    }

    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${abspath} is not valid JSON.`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${abspath} must be a JSON object keyed by variable name.`);
  }

  return parsed as VariablesFile;
};

export const writeVariablesFile = async (
  abspath: string,
  file: VariablesFile,
): Promise<void> => {
  await fs.outputFile(abspath, `${JSON.stringify(file, null, 2)}\n`);
};

export const upsertEntry = (
  file: VariablesFile,
  key: string,
  entry: VariableEntry,
): VariablesFile => ({
  ...file,
  [key]: entry,
});

export const removeEntry = (
  file: VariablesFile,
  key: string,
): { file: VariablesFile; removed: boolean } => {
  if (!(key in file)) return { file, removed: false };
  const next = { ...file };
  delete next[key];
  return { file: next, removed: true };
};
