import { Command, Flags, Interfaces } from "@oclif/core";

import { AnyObj } from "@/lib/helpers/object";

import KnockApiV1 from "./api-v1";
import * as RunContext from "./run-context";
import UserConfig from "./user-config";

export type BFlags = Interfaces.InferredFlags<
  (typeof BaseCommand)["baseFlags"]
>;

type TFlags<T extends typeof Command> = Interfaces.InferredFlags<T["flags"]> &
  BFlags;

type TArgs<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

// Typed exactly with the underlying command flags and args.
type TProps<T extends typeof Command> = {
  flags: TFlags<T>;
  args: TArgs<T>;
};

// Typed loosely without any specific command.
type UnknownProps = {
  flags: AnyObj & BFlags;
  args: AnyObj;
};

export type Props<T = unknown> = T extends typeof Command
  ? TProps<T>
  : UnknownProps;

abstract class BaseCommand<T extends typeof Command> extends Command {
  protected props!: TProps<T>;
  protected apiV1!: KnockApiV1;
  protected runContext!: RunContext.T;

  public async init(): Promise<void> {
    await super.init();

    // 1. Load user's config from the config dir, as available.
    await UserConfig.load(this.config.configDir);

    // 2. Parse flags and args, must come after the user config load.
    const { args, flags } = await this.parse(this.ctor);
    this.props = { args: args as TArgs<T>, flags: flags as TFlags<T> };

    // 3. Instantiate a knock api client.
    this.apiV1 = new KnockApiV1(this.props.flags, this.config);

    // 4. Load the run context of the invoked command.
    this.runContext = await RunContext.load(this.id);
  }

  // Base flags are inherited by any command that extends BaseCommand.
  static baseFlags = {
    // Evaluated in the following precedence:
    // - service token flag passed into the command
    // - if not provided, fall back to env variable
    // - if not available, fall back to user config
    "service-token": Flags.string({
      summary: "The service token to authenticate with.",
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
      default: async () => UserConfig.get().apiOrigin,
    }),
  };
}

export default BaseCommand;
