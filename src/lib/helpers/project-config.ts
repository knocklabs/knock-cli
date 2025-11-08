import * as path from "node:path";

import findUp from "find-up";
import * as fs from "fs-extra";
import { z } from "zod";

import { ResourceType } from "../run-context/types";
import { DirContext, isDirectory } from "./fs";

/**
 * The name of the project configuration file.
 */
export const PROJECT_CONFIG_FILE_NAME = "knock.json";

/**
 * Schema for the project configuration file.
 */
const projectConfigSchema = z.object({
  knockDir: z.string(),
});

export type ProjectConfig = z.infer<typeof projectConfigSchema>;

/**
 * Finds the knock.json file by walking up the directory tree from the current
 * working directory.
 *
 * @returns the path to the knock.json file, or undefined if not found
 */
export const findProjectConfig = async (): Promise<string | undefined> => {
  const configPath = await findUp(PROJECT_CONFIG_FILE_NAME);
  return configPath;
};

/**
 * Reads and parses the knock.json file.
 *
 * @param configPath - the path to the knock.json file
 * @returns the parsed project configuration
 * @throws if the file cannot be read or parsed
 */
export const readProjectConfig = async (
  configPath: string,
): Promise<ProjectConfig> => {
  const rawConfig = await fs.readJSON(configPath);
  const config = projectConfigSchema.parse(rawConfig);
  return config;
};

/**
 * Resolves the knock directory path, with the following precedence:
 * 1. If knockDirFlag is provided, use it (flag takes precedence)
 * 2. Otherwise, if projectConfig is provided, use its knockDir
 * 3. Otherwise, return undefined
 *
 * @param knockDirFlag - the --knock-dir flag value, if provided
 * @param projectConfig - the project configuration, if available
 * @returns the knock directory path, or undefined if neither is available
 */
export const resolveKnockDir = async (
  knockDirFlag: DirContext | undefined,
  projectConfig: ProjectConfig | undefined,
): Promise<DirContext | undefined> => {
  if (knockDirFlag) {
    return knockDirFlag;
  }

  if (!projectConfig) {
    return undefined;
  }

  // Project configuration exists, must is invalid. So we error out.
  if (["", undefined, null].includes(projectConfig.knockDir)) {
    throw new Error(
      "No knock directory specified in the project configuration",
    );
  }

  const abspath = path.isAbsolute(projectConfig.knockDir)
    ? projectConfig.knockDir
    : path.resolve(process.cwd(), projectConfig.knockDir);

  const exists = await fs.pathExists(abspath);

  if (!exists || !(await isDirectory(abspath))) {
    throw new Error(
      `${projectConfig.knockDir} does not exist or is not a directory`,
    );
  }

  return { abspath, exists };
};

/**
 * Finds and reads the knock.json configuration file.
 * Returns undefined if the file is not found.
 *
 * @returns the project configuration, or undefined if not found
 */
export const findAndReadProjectConfig = async (): Promise<
  ProjectConfig | undefined
> => {
  const configPath = await findProjectConfig();

  if (!configPath) {
    return undefined;
  }

  return readProjectConfig(configPath);
};

/**
 * Resource subdirectory names as they appear in the knock directory.
 */

export const ResourceDirectoriesByType: Record<
  Exclude<ResourceType, "reusable_step">,
  string
> = {
  workflow: "workflows",
  guide: "guides",
  partial: "partials",
  email_layout: "layouts",
  message_type: "message-types",
  translation: "translations",
} as const;

type ValidResourceType = Exclude<ResourceType, "reusable_step">;

/**
 * Resolves the full path to a resource directory within the knock directory.
 *
 * @param projectConfig - the project configuration, if available
 * @param resourceType - the type of resource
 * @param basePath - optional base path to resolve relative knockDir against (defaults to cwd)
 * @returns the absolute path to the resource directory
 */
export const resolveResourceDir = async (
  projectConfig: ProjectConfig | undefined,
  resourceType: ValidResourceType,
  basePath: string = process.cwd(),
): Promise<DirContext> => {
  if (!projectConfig) {
    return {
      abspath: basePath,
      exists: true,
    };
  }

  const absoluteKnockDir = path.isAbsolute(projectConfig.knockDir)
    ? projectConfig.knockDir
    : path.resolve(basePath, projectConfig.knockDir);

  const resourceDir = ResourceDirectoriesByType[resourceType];

  const absResourceDirPath = path.resolve(absoluteKnockDir, resourceDir);
  const exists = await fs.pathExists(absResourceDirPath);

  if (exists && !(await isDirectory(absResourceDirPath))) {
    throw new Error(`${absResourceDirPath} is not a directory`);
  }

  return {
    abspath: absResourceDirPath,
    exists,
  };
};
