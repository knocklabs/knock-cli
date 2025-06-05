import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import * as CustomFlags from "@/lib/helpers/flag";

export default class Push extends BaseCommand<typeof Push> {
  static summary = "Push all resources from a local file system to Knock.";

  static flags = {
    environment: Flags.string({
      summary:
        "Pushing resources is only allowed in the development environment",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    "knock-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all resources into.",
      required: true,
    }),
    commit: Flags.boolean({
      summary: "Push and commit the resource(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
  };

  async run(): Promise<void> {
    // TODO
  }
}
