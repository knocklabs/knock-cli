import * as path from "node:path";

import { Flags } from "@oclif/core";
import * as fs from "fs-extra";

import BaseCommand from "@/lib/base-command";
import { runBulkResourceCommand } from "@/lib/helpers/bulk-soft-fail";
import * as CustomFlags from "@/lib/helpers/flag";
import { DirContext } from "@/lib/helpers/fs";
import { resolveKnockDir } from "@/lib/helpers/project-config";
import {
  ALL_RESOURCE_TYPES,
  buildBulkPushArgs,
  BulkPushFlags,
  NonHiddenResourceType,
  RESOURCE_DIR_FLAGS,
  RESOURCE_SUBDIRS,
} from "@/lib/resources";

import AudiencePush from "./audience/push";
import GoalPush from "./goal/push";
import GuidePush from "./guide/push";
import EmailLayoutPush from "./layout/push";
import MessageTypePush from "./message-type/push";
import PartialPush from "./partial/push";
import TranslationPush from "./translation/push";
import WorkflowPush from "./workflow/push";

export default class Push extends BaseCommand<typeof Push> {
  static summary = "Push all resources from a local file system to Knock.";

  static flags = {
    environment: CustomFlags.environment,
    branch: CustomFlags.branch,
    "knock-dir": CustomFlags.dirPath({
      summary: "The target directory path to find all resources to push.",
      required: false,
    }),
    commit: Flags.boolean({
      summary: "Push and commit the resource(s) at the same time",
    }),
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message",
      char: "m",
      dependsOn: ["commit"],
    }),
    "allow-empty": CustomFlags.allowEmptyOnPush,
    force: CustomFlags.force,
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    // Resolve knock directory: flag takes precedence, otherwise use knock.json
    const targetDirCtx = await resolveKnockDir(
      flags["knock-dir"],
      this.projectConfig,
    );

    if (!targetDirCtx) {
      this.error(
        "No knock directory specified. Either provide --knock-dir flag or run `knock init` to create a knock.json configuration file.",
      );
    }

    // Note: Because we're pushing the different resource types sequentially,
    // if one of the push commands fails, we may end up in a partially pushed
    // state, with only some of the resources upserted. This is the best we can
    // do until we have a bulk push mAPI endpoint.
    for (const resourceType of ALL_RESOURCE_TYPES) {
      // eslint-disable-next-line no-await-in-loop
      await runResourcePushCommand(resourceType, targetDirCtx, flags);
    }
  }
}

const runResourcePushCommand = async (
  resourceType: NonHiddenResourceType,
  targetDirCtx: DirContext,
  flags: BulkPushFlags,
): Promise<void> => {
  const subdirPath = path.resolve(
    targetDirCtx.abspath,
    RESOURCE_SUBDIRS[resourceType],
  );

  const hasResources = await fs.pathExists(subdirPath);

  if (!hasResources) {
    return;
  }

  const args = [
    ...buildBulkPushArgs(resourceType, flags),
    RESOURCE_DIR_FLAGS[resourceType],
    subdirPath,
  ];

  // Soft-fail only for gate/scope errors (see isSoftFailableBulkError), so
  // validation failures still abort the rest of `knock push`.
  return runBulkResourceCommand(resourceType, () => {
    switch (resourceType) {
      case "audience":
        return AudiencePush.run(args);

      case "email_layout":
        return EmailLayoutPush.run(args);

      case "partial":
        return PartialPush.run(args);

      case "translation":
        return TranslationPush.run(args);

      case "workflow":
        return WorkflowPush.run(args);

      case "message_type":
        return MessageTypePush.run(args);

      case "guide":
        return GuidePush.run(args);

      case "goal":
        return GoalPush.run(args);

      default: {
        const invalidResourceType: never = resourceType;
        throw new Error(`Unknown resource type: ${invalidResourceType}`);
      }
    }
  });
};
