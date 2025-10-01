import * as path from "node:path";

import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import * as CustomFlags from "@/lib/helpers/flag";
import { DirContext } from "@/lib/helpers/fs";
import { promptToConfirm } from "@/lib/helpers/ux";
import {
  ALL_RESOURCE_TYPES,
  NonHiddenResourceType,
  RESOURCE_SUBDIRS,
} from "@/lib/resources";

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
    branch: CustomFlags.branch,
    "knock-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all resources into.",
      required: true,
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
    const targetDirCtx = flags["knock-dir"];

    const prompt = targetDirCtx.exists
      ? `Pull latest resources into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new resources directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    const args = [
      "--all",
      "--environment",
      flags.environment,
      ...(flags.branch ? ["--branch", flags.branch] : []),
      ...(flags["hide-uncommitted-changes"]
        ? ["--hide-uncommitted-changes"]
        : []),
      ...(flags["service-token"]
        ? ["--service-token", flags["service-token"]]
        : []),
      // Always use the force flag to skip prompts
      "--force",
    ];

    for (const resourceType of ALL_RESOURCE_TYPES) {
      // eslint-disable-next-line no-await-in-loop
      await runResourcePullCommand(resourceType, targetDirCtx, args);
    }
  }
}

const runResourcePullCommand = async (
  resourceType: NonHiddenResourceType,
  targetDirCtx: DirContext,
  args: string[],
): Promise<void> => {
  const subdirPath = path.resolve(
    targetDirCtx.abspath,
    RESOURCE_SUBDIRS[resourceType],
  );

  switch (resourceType) {
    case "email_layout":
      return EmailLayoutPull.run([...args, "--layouts-dir", subdirPath]);

    case "partial":
      return PartialPull.run([...args, "--partials-dir", subdirPath]);

    case "translation":
      return TranslationPull.run([...args, "--translations-dir", subdirPath]);

    case "workflow":
      return WorkflowPull.run([...args, "--workflows-dir", subdirPath]);

    default: {
      const invalidResourceType: never = resourceType;
      throw new Error(`Unknown resource type: ${invalidResourceType}`);
    }
  }
};
