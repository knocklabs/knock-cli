import * as path from "node:path";

import { Channel } from "@knocklabs/mgmt/resources/channels";
import { Flags } from "@oclif/core";
import { prompt } from "enquirer";

import BaseCommand from "@/lib/base-command";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import { slugify } from "@/lib/helpers/string";
import { promptToConfirm } from "@/lib/helpers/ux";
import * as Broadcast from "@/lib/marshal/broadcast";
import {
  groupChannelsByType,
  parseStepsInput,
  StepTag,
  StepTagChoices,
} from "@/lib/marshal/workflow/generator";
import { BroadcastDirContext } from "@/lib/run-context";

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
    steps: Flags.string({
      summary:
        "Comma-separated list of channel step types to include in the broadcast (e.g. email,in_app_feed). Broadcasts need at least one channel step.",
      char: "s",
    }),
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

    const channelsByType = groupChannelsByType(
      await this.apiV1.listAllChannels(),
    );
    const steps = await this.getSteps(flags.steps, channelsByType);

    const broadcastDirCtx = await this.getBroadcastDirContext(key);

    const promptMessage = broadcastDirCtx.exists
      ? `Found \`${broadcastDirCtx.key}\` at ${broadcastDirCtx.abspath}, overwrite?`
      : `Create a new broadcast directory \`${broadcastDirCtx.key}\` at ${broadcastDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(promptMessage));
    if (!input) return;

    await Broadcast.generateBroadcastDir(
      broadcastDirCtx,
      { key, name, steps },
      channelsByType,
    );

    this.log(`‣ Successfully created broadcast \`${key}\``);
  }

  async getSteps(
    stepStr: string | undefined,
    channelsByType: Record<Channel["type"], Channel[]>,
  ): Promise<StepTag[]> {
    const channelTypes = Object.keys(channelsByType) as Channel["type"][];
    const availableStepTypes =
      Broadcast.getAvailableBroadcastStepTypes(channelTypes);

    if (availableStepTypes.length === 0) {
      return this.error(
        "Broadcasts need at least one channel step, but no email, in-app feed, SMS, push, or chat channels are configured. Add a channel in the Knock dashboard, then try again.",
      );
    }

    if (stepStr !== undefined) {
      const [parsedSteps, stepsError] = parseStepsInput(
        stepStr,
        availableStepTypes,
      );
      if (stepsError) {
        return this.error(`Invalid --steps \`${stepStr}\` (${stepsError})`);
      }

      if (!parsedSteps || parsedSteps.length === 0) {
        return this.error(
          `Invalid --steps \`${stepStr}\` (at least one channel step is required)`,
        );
      }

      return parsedSteps;
    }

    const stepsResponse = await prompt<{ steps: string[] }>({
      type: "multiselect",
      name: "steps",
      message: "Select channel steps for the broadcast",
      choices: availableStepTypes.map((stepType) => ({
        name: stepType,
        message: StepTagChoices[stepType],
      })),
      // Enquirer types `validate` for text prompts, but a multiselect passes
      // the selected choice names.
      validate: (value: unknown) =>
        (Array.isArray(value) && value.length > 0) ||
        "Select at least one channel step",
    });

    return (stepsResponse?.steps || []) as StepTag[];
  }

  // `run` errors before this when invoked inside any resource directory, so
  // the broadcast directory always resolves from the project config.
  async getBroadcastDirContext(
    broadcastKey: string,
  ): Promise<BroadcastDirContext> {
    const dirCtx = await resolveResourceDir(
      this.projectConfig,
      "broadcast",
      this.runContext.cwd,
    );

    const dirPath = path.resolve(dirCtx.abspath, broadcastKey);
    const exists = await Broadcast.isBroadcastDir(dirPath);

    return {
      type: "broadcast",
      key: broadcastKey,
      abspath: dirPath,
      exists,
    };
  }
}
