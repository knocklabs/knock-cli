import * as path from "node:path";

import { Flags, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import * as CustomFlags from "@/lib/helpers/flag";
import { DirContext } from "@/lib/helpers/fs";
import { resolveKnockDir } from "@/lib/helpers/project-config";
import { promptToConfirm } from "@/lib/helpers/ux";
import {
    ALL_RESOURCE_TYPES,
    buildBulkPullArgs,
    BulkPullFlags,
    NonHiddenResourceType,
    RESOURCE_CLI_CAPABILITIES,
    RESOURCE_DIR_FLAGS,
    RESOURCE_SUBDIRS,
} from "@/lib/resources";

import AudiencePull from "./audience/pull";
import GoalPull from "./goal/pull";
import GuidePull from "./guide/pull";
import EmailLayoutPull from "./layout/pull";
import MessageTypePull from "./message-type/pull";
import PartialPull from "./partial/pull";
import TranslationPull from "./translation/pull";
import WorkflowPull from "./workflow/pull";

export default class Pull extends BaseCommand<typeof Pull> {
  static summary =
    "Pull all resources from an environment into a local file system.";

  static flags = {
    environment: CustomFlags.environment,
    branch: CustomFlags.branch,
    "knock-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all resources into.",
      required: false,
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

    const prompt = targetDirCtx.exists
      ? `Pull latest resources into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new resources directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    for (const resourceType of ALL_RESOURCE_TYPES) {
      // eslint-disable-next-line no-await-in-loop
      await runResourcePullCommand(resourceType, targetDirCtx, flags);
    }
  }
}

const runResourcePullCommand = async (
  resourceType: NonHiddenResourceType,
  targetDirCtx: DirContext,
  flags: BulkPullFlags,
): Promise<void> => {
  const subdirPath = path.resolve(
    targetDirCtx.abspath,
    RESOURCE_SUBDIRS[resourceType],
  );
  const args = [
    ...buildBulkPullArgs(resourceType, flags),
    RESOURCE_DIR_FLAGS[resourceType],
    subdirPath,
  ];

  try {
    switch (resourceType) {
      case "audience":
        return await AudiencePull.run(args);

      case "email_layout":
        return await EmailLayoutPull.run(args);

      case "partial":
        return await PartialPull.run(args);

      // TODO(KNO-9451): Include translation in the knock pull
      case "translation":
        return await TranslationPull.run(args);

      case "workflow":
        return await WorkflowPull.run(args);

      case "message_type":
        return await MessageTypePull.run(args);

      case "guide":
        return await GuidePull.run(args);

      case "goal":
        return await GoalPull.run(args);

      default: {
        const invalidResourceType: never = resourceType;
        throw new Error(`Unknown resource type: ${invalidResourceType}`);
      }
    }
  } catch (error) {
    // Some resources (e.g. goals) are gated server-side. Soft-fail so the rest
    // of `knock pull` (workflows, guides, etc.) still completes.
    if (RESOURCE_CLI_CAPABILITIES[resourceType].softFailOnBulk) {
      ux.warn(
        `Skipping ${RESOURCE_SUBDIRS[resourceType]}: ${
          (error as Error).message
        }`,
      );
      return;
    }

    throw error;
  }
};
