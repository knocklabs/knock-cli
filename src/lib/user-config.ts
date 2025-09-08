/*
 * Module for loading and retrieving user configs from a knock config file.
 */
import * as path from "node:path";

import * as fs from "fs-extra";
import { z } from "zod";

import { isTestEnv } from "@/lib/helpers/const";

const userConfigSchema = z.object({
  serviceToken: z.string().optional(),
  apiOrigin: z.string().optional(),
});

type UserConfig = z.infer<typeof userConfigSchema>;

let USER_CONFIG: UserConfig;

const maybeReadJsonConfig = async (configDir: string) => {
  // Don't use a user config file in tests.
  if (isTestEnv) return null;

  const pathToJsonConfig = path.resolve(configDir, "config.json");

  const exists = await fs.pathExists(pathToJsonConfig);
  if (!exists) return null;

  return fs.readJSON(pathToJsonConfig);
};

const load = async (configDir: string): Promise<UserConfig> => {
  const readConfig = await maybeReadJsonConfig(configDir);
  const validConfig = userConfigSchema.parse(readConfig || {});

  // If no valid user config was available, give it an empty map.
  USER_CONFIG = validConfig || {};

  return USER_CONFIG;
};

const get = (): UserConfig => {
  if (!USER_CONFIG) {
    throw new Error("User config must be loaded first.");
  }

  return USER_CONFIG;
};

export default { load, get };
