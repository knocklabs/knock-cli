import { Command, Flags } from "@oclif/core";

import UserConfig from "./userConfig";

abstract class BaseCommand extends Command {
  public async init(): Promise<void> {
    await super.init();

    // Load user's config from the config dir, as available.
    await UserConfig.load(this.config.configDir);
  }

  // Global flags are inherited by any command that extends BaseCommand.
  static globalFlags = {
    // Evaluated in the following precedence:
    // - service token flag passed into the command
    // - if not provided, fall back to env variable
    // - if not available, fall back to user config
    "service-token": Flags.string({
      summary: "service token to authenticate with",
      required: true,
      multiple: false,
      env: "KNOCK_SERVICE_TOKEN",
      default: async () => UserConfig.get().serviceToken,
    }),
  };
}

export default BaseCommand;
