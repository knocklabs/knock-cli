import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";

export default class Pull extends BaseCommand<typeof Pull> {
  static summary =
    "Pull all resources from an environment into a local file system.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
  };

  public async run(): Promise<void> {
    // TODO
    this.log("TODO");
  }
}
