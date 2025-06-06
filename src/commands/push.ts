import * as path from "node:path";

import { Flags } from "@oclif/core";
import * as fs from "fs-extra";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import * as CustomFlags from "@/lib/helpers/flag";

import EmailLayoutPush from "./layout/push";

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
    const { flags } = this.props;

    const targetDirCtx = flags["knock-dir"];

    if (!targetDirCtx.exists) {
      this.error(`Directory ${targetDirCtx.abspath} does not exist`);
    }

    const args = [
      "--all",
      "--environment",
      flags.environment,
      ...(flags["service-token"]
        ? ["--service-token", flags["service-token"]]
        : []),
      ...(flags.commit ? ["--commit"] : []),
      ...(flags["commit-message"]
        ? ["--commit-message", flags["commit-message"]]
        : []),
    ];

    const layoutsPath = path.resolve(targetDirCtx.abspath, "layouts");
    const hasLayouts = await fs.pathExists(layoutsPath);

    if (hasLayouts) {
      await EmailLayoutPush.run([...args, "--layouts-dir", layoutsPath]);
    }
  }
}
