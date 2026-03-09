import * as path from "node:path";

import { Flags } from "@oclif/core";
import { prompt } from "enquirer";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import * as CustomFlags from "@/lib/helpers/flag";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import { slugify } from "@/lib/helpers/string";
import { promptToConfirm } from "@/lib/helpers/ux";
import * as Broadcast from "@/lib/marshal/broadcast";
import {
  BroadcastDirContext,
  ensureResourceDirForTarget,
  ResourceTarget,
} from "@/lib/run-context";

export default class BroadcastNew extends BaseCommand<typeof BroadcastNew> {
  static summary = "Create a new broadcast with a minimal configuration.";

  static flags = {
    name: Flags.string({
      summary: "The name of the broadcast",
      char: "n",
    }),
    key: Flags.string({
      summary: "The key of the broadcast",
      char: "k",
    }),
    environment: Flags.string({
      summary:
        "The environment to create the broadcast in. Defaults to development.",
      default: KnockEnv.Development,
    }),
    branch: CustomFlags.branch,
    force: Flags.boolean({
      summary:
        "Force the creation of the broadcast directory without confirmation.",
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = this.props;
    const { resourceDir } = this.runContext;

    if (resourceDir) {
      return this.error(
        `Cannot create a new broadcast inside an existing ${resourceDir.type} directory`,
      );
    }

    let name = flags.name;
    let key = flags.key;

    if (!name) {
      const nameResponse = await prompt<{ name: string }>({
        type: "input",
        name: "name",
        message: "Broadcast name",
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Broadcast name is required";
          }

          return true;
        },
      });
      name = nameResponse.name;
    }

    if (!key) {
      const keyResponse = await prompt<{ key: string }>({
        type: "input",
        name: "key",
        message: "Broadcast key (immutable slug)",
        initial: slugify(name),
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Broadcast key is required";
          }

          const keyError = Broadcast.validateBroadcastKey(value);
          if (keyError) {
            return `Invalid broadcast key: ${keyError}`;
          }

          return true;
        },
      });
      key = keyResponse.key;
    }

    const broadcastKeyError = Broadcast.validateBroadcastKey(key);
    if (broadcastKeyError) {
      return this.error(
        `Invalid broadcast key \`${key}\` (${broadcastKeyError})`,
      );
    }

    const broadcastDirCtx = await this.getBroadcastDirContext(key);

    const promptMessage = broadcastDirCtx.exists
      ? `Found \`${broadcastDirCtx.key}\` at ${broadcastDirCtx.abspath}, overwrite?`
      : `Create a new broadcast directory \`${broadcastDirCtx.key}\` at ${broadcastDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(promptMessage));
    if (!input) return;

    await Broadcast.generateBroadcastDir(broadcastDirCtx, key);

    this.log(`‣ Successfully created broadcast \`${key}\``);
  }

  async getBroadcastDirContext(
    broadcastKey?: string,
  ): Promise<BroadcastDirContext> {
    const { resourceDir, cwd: runCwd } = this.runContext;

    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: this.id ?? "broadcast:new",
        type: "broadcast",
        key: broadcastKey,
      };

      return ensureResourceDirForTarget(
        resourceDir,
        target,
      ) as BroadcastDirContext;
    }

    const dirCtx = await resolveResourceDir(
      this.projectConfig,
      "broadcast",
      runCwd,
    );

    if (broadcastKey) {
      const dirPath = path.resolve(dirCtx.abspath, broadcastKey);
      const exists = await Broadcast.isBroadcastDir(dirPath);

      return {
        type: "broadcast",
        key: broadcastKey,
        abspath: dirPath,
        exists,
      };
    }

    return this.error("Missing 1 required arg:\nbroadcastKey");
  }
}
