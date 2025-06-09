import * as path from "node:path";

import { Flags } from "@oclif/core";
import * as fs from "fs-extra";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import * as CustomFlags from "@/lib/helpers/flag";
import { DirContext } from "@/lib/helpers/fs";
import {
  ALL_RESOURCE_TYPES,
  NonHiddenResourceType,
  RESOURCE_SUBDIRS,
} from "@/lib/resources";

import EmailLayoutPush from "./layout/push";
import PartialPush from "./partial/push";
import TranslationPush from "./translation/push";
import WorkflowPush from "./workflow/push";

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
      summary: "The target directory path to find all resources to push.",
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

    for (const resourceType of ALL_RESOURCE_TYPES) {
      // eslint-disable-next-line no-await-in-loop
      await runResourcePushCommand(resourceType, targetDirCtx, args);
    }
  }
}

const runResourcePushCommand = async (
  resourceType: NonHiddenResourceType,
  targetDirCtx: DirContext,
  args: string[],
): Promise<void> => {
  const subdirPath = path.resolve(
    targetDirCtx.abspath,
    RESOURCE_SUBDIRS[resourceType],
  );

  const hasResources = await fs.pathExists(subdirPath);

  if (!hasResources) {
    return;
  }

  switch (resourceType) {
    case "email_layout":
      return EmailLayoutPush.run([...args, "--layouts-dir", subdirPath]);

    case "partial":
      return PartialPush.run([...args, "--partials-dir", subdirPath]);

    case "translation":
      return TranslationPush.run([...args, "--translations-dir", subdirPath]);

    case "workflow":
      return WorkflowPush.run([...args, "--workflows-dir", subdirPath]);

    default: {
      const invalidResourceType: never = resourceType;
      throw new Error(`Unknown resource type: ${invalidResourceType}`);
    }
  }
};
