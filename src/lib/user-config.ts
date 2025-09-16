/*
 * Module for loading and retrieving user configs from a knock config file.
 */
import * as path from "node:path";

import * as fs from "fs-extra";
import { z } from "zod";

import { isTestEnv } from "@/lib/helpers/const";

// When a user has authenticated via OAuth, we store the session in the user config.
const userSessionSchema = z.object({
  accessToken: z.string(),
  clientId: z.string(),
  refreshToken: z.string(),
});

const userConfigSchema = z.object({
  serviceToken: z.string().optional(),
  apiOrigin: z.string().optional(),
  dashboardOrigin: z.string().optional(),
  authOrigin: z.string().optional(),
  userSession: userSessionSchema.optional(),
});

export type UserConfig = z.infer<typeof userConfigSchema>;

class UserConfigStore {
  private configDir: string;
  private userConfig: UserConfig;

  constructor(configDir: string) {
    this.configDir = configDir;
    this.userConfig = {};
  }

  public async load(): Promise<UserConfig> {
    const readConfig = await this.maybeReadJsonConfig();
    const validConfig = userConfigSchema.parse(readConfig || {});
    this.userConfig = validConfig || {};
    return this.userConfig;
  }

  public get(): UserConfig {
    return this.userConfig;
  }

  public async set(updatedConfig: UserConfig): Promise<UserConfig> {
    this.userConfig = { ...this.userConfig, ...updatedConfig };
    await this.maybeWriteJsonConfig();
    return this.userConfig;
  }

  private configPath(): string {
    return path.resolve(this.configDir, "config.json");
  }

  private async maybeReadJsonConfig(): Promise<UserConfig> {
    if (isTestEnv) return {};

    const path = this.configPath();

    const exists = await fs.pathExists(path);
    if (!exists) return {};

    return fs.readJSON(path);
  }

  private async maybeWriteJsonConfig(): Promise<void> {
    if (isTestEnv) return;

    const path = this.configPath();
    await fs.outputJson(path, this.userConfig, { spaces: 2 });
  }
}

export { UserConfigStore };
