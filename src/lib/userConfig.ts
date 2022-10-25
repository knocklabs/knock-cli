/*
 * Module to load and get user configs from a config file.
 */
import * as path from "path";
import * as fs from "fs-extra";
import * as yup from "yup";

const userConfigSchema = yup.object({
  serviceToken: yup.string(),
});

type UserConfig = yup.InferType<typeof userConfigSchema>;

let USER_CONFIG: UserConfig;

const maybeReadJsonConfig = async (configDir: string) => {
  const pathToJsonConfig = path.join(configDir, "config.json");

  const exists = await fs.pathExists(pathToJsonConfig);
  if (!exists) return null;

  return await fs.readJSON(pathToJsonConfig);
};

const load = async (configDir: string): Promise<UserConfig> => {
  const readConfig = await maybeReadJsonConfig(configDir);
  const validConfig = await userConfigSchema.validate(readConfig || {});

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
