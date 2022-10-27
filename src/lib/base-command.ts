import { Command, Flags, Interfaces } from "@oclif/core";

import KnockApiV1 from "./api-v1";
import UserConfig from "./user-config";

abstract class BaseCommand extends Command {
  protected props!: Interfaces.ParserOutput;
  protected apiV1!: KnockApiV1;

  public async init(): Promise<void> {
    await super.init();

    // 1. Load user's config from the config dir, as available.
    await UserConfig.load(this.config.configDir);

    // 2. Parse flags and args, must come after the user config load.
    this.props = await this.parse(this.constructor as Interfaces.Command.Class);

    // 3. Instantiate a knock api client.
    this.apiV1 = new KnockApiV1(this.props.flags, this.config);
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

    // Hidden flag to use a different api base url for development purposes.
    "api-origin": Flags.string({
      hidden: true,
      required: false,
      multiple: false,
    }),
  };
}

export default BaseCommand;