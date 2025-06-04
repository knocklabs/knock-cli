import * as path from "node:path";

import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import * as CustomFlags from "@/lib/helpers/flag";
import { promptToConfirm } from "@/lib/helpers/ux";

import EmailLayoutPull from "./layout/pull";
import PartialPull from "./partial/pull";
import TranslationPull from "./translation/pull";
import WorkflowPull from "./workflow/pull";

export default class Pull extends BaseCommand<typeof Pull> {
  static summary =
    "Pull all resources from an environment into a local file system.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    dir: CustomFlags.dirPath({
      summary: "The target directory path to pull all resources into.",
    }),
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  public async run(): Promise<void> {
    const { flags } = this.props;

    const defaultToCwd = { abspath: this.runContext.cwd, exists: true };
    const targetDirCtx = flags.dir || defaultToCwd;

    const prompt = targetDirCtx.exists
      ? `Pull latest resources into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new resources directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    const args = [
      "--all",
      "--environment",
      flags.environment,
      ...(flags["hide-uncommitted-changes"]
        ? ["--hide-uncommitted-changes"]
        : []),
      ...(flags["service-token"]
        ? ["--service-token", flags["service-token"]]
        : []),
      // Always use the force flag to skip prompts
      "--force",
    ];

    await EmailLayoutPull.run([
      ...args,
      "--layouts-dir",
      path.resolve(targetDirCtx.abspath, "layouts"),
    ]);
    await PartialPull.run([
      ...args,
      "--partials-dir",
      path.resolve(targetDirCtx.abspath, "partials"),
    ]);
    await TranslationPull.run([
      ...args,
      "--translations-dir",
      path.resolve(targetDirCtx.abspath, "translations"),
    ]);
    await WorkflowPull.run([
      ...args,
      "--workflows-dir",
      path.resolve(targetDirCtx.abspath, "workflows"),
    ]);
  }
}
