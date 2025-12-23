import * as path from "node:path";

import { Flags } from "@oclif/core";
import { prompt } from "enquirer";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import * as CustomFlags from "@/lib/helpers/flag";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import { slugify } from "@/lib/helpers/string";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Guide from "@/lib/marshal/guide";
import { MessageTypeData } from "@/lib/marshal/message-type";
import {
  ensureResourceDirForTarget,
  GuideDirContext,
  ResourceTarget,
} from "@/lib/run-context";

import GuidePush from "./push";

export default class GuideNew extends BaseCommand<typeof GuideNew> {
  static summary = "Create a new guide with a minimal configuration.";

  static flags = {
    name: Flags.string({
      summary: "The name of the guide",
      char: "n",
    }),
    key: Flags.string({
      summary: "The key of the guide",
      char: "k",
    }),
    "message-type": Flags.string({
      summary:
        "The message type key to use for the guide. You cannot use this flag with --template.",
      char: "m",
    }),
    environment: Flags.string({
      summary:
        "The environment to create the guide in. Defaults to development.",
      default: KnockEnv.Development,
    }),
    branch: CustomFlags.branch,
    force: Flags.boolean({
      summary:
        "Force the creation of the guide directory without confirmation.",
    }),
    push: Flags.boolean({
      summary: "Whether or not to push the guide to Knock after creation.",
      default: false,
      char: "p",
    }),
    template: Flags.string({
      summary:
        "The template to use for the guide. Should be `guides/{key}`. You cannot use this flag with --message-type.",
      char: "t",
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = this.props;
    const { resourceDir } = this.runContext;

    // 1. Ensure we aren't in any existing resource directory already.
    if (resourceDir) {
      return this.error(
        `Cannot create a new guide inside an existing ${resourceDir.type} directory`,
      );
    }

    // 2. Validate that template and message-type flags are not used together
    if (flags.template && flags["message-type"]) {
      return this.error(
        "Cannot use both --template and --message-type flags together",
      );
    }

    // 3. Prompt for name and key if not provided
    let name = flags.name;
    let key = flags.key;

    if (!name) {
      const nameResponse = await prompt<{ name: string }>({
        type: "input",
        name: "name",
        message: "Guide name",
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Guide name is required";
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
        message: "Guide key (immutable slug)",
        initial: slugify(name),
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Guide key is required";
          }

          const keyError = Guide.validateGuideKey(value);
          if (keyError) {
            return `Invalid guide key: ${keyError}`;
          }

          return true;
        },
      });
      key = keyResponse.key;
    }

    // Validate the guide key
    const guideKeyError = Guide.validateGuideKey(key);
    if (guideKeyError) {
      return this.error(`Invalid guide key \`${key}\` (${guideKeyError})`);
    }

    const guideDirCtx = await this.getGuideDirContext(key);

    const promptMessage = guideDirCtx.exists
      ? `Found \`${guideDirCtx.key}\` at ${guideDirCtx.abspath}, overwrite?`
      : `Create a new guide directory \`${guideDirCtx.key}\` at ${guideDirCtx.abspath}?`;

    // Check if the guide directory already exists, and prompt to confirm if not. Prompt to overwrite if it does.
    const input = flags.force || (await promptToConfirm(promptMessage));
    if (!input) return;

    // Generate the guide either from a template or from scratch
    await (flags.template
      ? this.fromTemplate(guideDirCtx, name, flags.template)
      : this.fromMessageType(guideDirCtx, name, flags["message-type"]));

    if (flags.push) {
      spinner.start("‣ Pushing guide to Knock");

      try {
        await GuidePush.run([key]);
      } catch (error) {
        this.error(`Failed to push guide to Knock: ${error}`);
      } finally {
        spinner.stop();
      }
    }

    this.log(`‣ Successfully created guide \`${key}\``);
  }

  async fromTemplate(
    guideDirCtx: GuideDirContext,
    name: string,
    templateString: string,
  ): Promise<void> {
    // When being called from the template string, we want to try and generate
    // the guide from the provided template.
    spinner.start(`‣ Generating guide from template \`${templateString}\``);

    try {
      await Guide.generateGuideFromTemplate(guideDirCtx, templateString, {
        name,
      });
    } catch (error) {
      this.error(`Failed to generate guide from template: ${error}`);
    } finally {
      spinner.stop();
    }
  }

  async fromMessageType(
    guideDirCtx: GuideDirContext,
    name: string,
    messageTypeKey?: string,
  ): Promise<void> {
    const { flags } = this.props;

    spinner.start(`‣ Fetching message types`);

    // Fetch all message types from the API
    const messageTypes = await this.apiV1.listAllMessageTypes({
      environment: flags.environment,
      hide_uncommitted_changes: true,
    });

    spinner.stop();

    if (messageTypes.length === 0) {
      return this.error(
        "No message types found. Please create a message type first.",
      );
    }

    let selectedMessageType: MessageTypeData;

    // Determine message type from flag or prompt
    if (messageTypeKey) {
      const messageType = messageTypes.find((mt) => mt.key === messageTypeKey);

      if (!messageType) {
        return this.error(`Message type \`${messageTypeKey}\` not found`);
      }

      selectedMessageType = messageType;
    } else {
      // Prompt for message type with select
      const messageTypeChoices = messageTypes.map((mt) => ({
        name: mt.key,
        message: `${mt.name} (${mt.key})`,
      }));

      const messageTypeResponse = await prompt<{ messageType: string }>({
        type: "select",
        name: "messageType",
        message: "Select message type",
        choices: messageTypeChoices,
      });

      const messageType = messageTypes.find(
        (mt) => mt.key === messageTypeResponse.messageType,
      );

      if (!messageType) {
        return this.error("Message type selection failed");
      }

      selectedMessageType = messageType;
    }

    // Generate the guide directory with scaffolded content
    await Guide.generateGuideDir(guideDirCtx, {
      name,
      messageType: selectedMessageType,
      variantKey: "default",
    });
  }

  async getGuideDirContext(guideKey?: string): Promise<GuideDirContext> {
    const { resourceDir, cwd: runCwd } = this.runContext;

    // Inside an existing resource dir, use it if valid for the target guide.
    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: BaseCommand.id,
        type: "guide",
        key: guideKey,
      };

      return ensureResourceDirForTarget(resourceDir, target) as GuideDirContext;
    }

    // Default to knock project config first if present, otherwise cwd.
    const dirCtx = await resolveResourceDir(
      this.projectConfig,
      "guide",
      runCwd,
    );

    // Not inside any existing guide directory, which means either create a
    // new guide directory in the cwd, or update it if there is one already.
    if (guideKey) {
      const dirPath = path.resolve(dirCtx.abspath, guideKey);
      const exists = await Guide.isGuideDir(dirPath);

      return {
        type: "guide",
        key: guideKey,
        abspath: dirPath,
        exists,
      };
    }

    // Not in any guide directory, nor a guide key arg was given so error.
    return this.error("Missing 1 required arg:\nguideKey");
  }
}
