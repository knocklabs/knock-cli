import * as path from "node:path";

import { Flags } from "@oclif/core";
import { prompt } from "enquirer";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import * as CustomFlags from "@/lib/helpers/flag";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import { slugify } from "@/lib/helpers/string";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as MessageType from "@/lib/marshal/message-type";
import {
  ensureResourceDirForTarget,
  MessageTypeDirContext,
  ResourceTarget,
} from "@/lib/run-context";

import MessageTypePush from "./push";

export default class MessageTypeNew extends BaseCommand<typeof MessageTypeNew> {
  static summary = "Create a new message type with a minimal configuration.";

  static flags = {
    name: Flags.string({
      summary: "The name of the message type",
      char: "n",
    }),
    key: Flags.string({
      summary: "The key of the message type",
      char: "k",
    }),
    environment: Flags.string({
      summary:
        "The environment to create the message type in. Defaults to development.",
      default: KnockEnv.Development,
    }),
    branch: CustomFlags.branch,
    force: Flags.boolean({
      summary:
        "Force the creation of the message type directory without confirmation.",
    }),
    push: Flags.boolean({
      summary:
        "Whether or not to push the message type to Knock after creation.",
      default: false,
      char: "p",
    }),
    template: Flags.string({
      summary:
        "The template to use for the message type. Should be `message-types/{key}`.",
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = this.props;
    const { resourceDir } = this.runContext;

    // 1. Ensure we aren't in any existing resource directory already.
    if (resourceDir) {
      return this.error(
        `Cannot create a new message type inside an existing ${resourceDir.type} directory`,
      );
    }

    // 2. Prompt for name and key if not provided
    let name = flags.name;
    let key = flags.key;

    if (!name) {
      const nameResponse = await prompt<{ name: string }>({
        type: "input",
        name: "name",
        message: "Message type name",
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Message type name is required";
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
        message: "Message type key (immutable slug)",
        initial: slugify(name),
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Message type key is required";
          }

          const keyError = MessageType.validateMessageTypeKey(value);
          if (keyError) {
            return `Invalid message type key: ${keyError}`;
          }

          return true;
        },
      });
      key = keyResponse.key;
    }

    // Validate the message type key
    const messageTypeKeyError = MessageType.validateMessageTypeKey(key);
    if (messageTypeKeyError) {
      return this.error(
        `Invalid message type key \`${key}\` (${messageTypeKeyError})`,
      );
    }

    const messageTypeDirCtx = await this.getMessageTypeDirContext(key);

    const promptMessage = messageTypeDirCtx.exists
      ? `Found \`${messageTypeDirCtx.key}\` at ${messageTypeDirCtx.abspath}, overwrite?`
      : `Create a new message type directory \`${messageTypeDirCtx.key}\` at ${messageTypeDirCtx.abspath}?`;

    // Check if the message type directory already exists, and prompt to confirm if not.
    const input = flags.force || (await promptToConfirm(promptMessage));
    if (!input) return;

    // Generate the message type either from a template or from scratch
    await (flags.template
      ? this.fromTemplate(messageTypeDirCtx, name, flags.template)
      : this.fromScratch(messageTypeDirCtx, name));

    if (flags.push) {
      spinner.start("‣ Pushing message type to Knock");

      try {
        await MessageTypePush.run([key]);
      } catch (error) {
        this.error(`Failed to push message type to Knock: ${error}`);
      } finally {
        spinner.stop();
      }
    }

    this.log(`‣ Successfully created message type \`${key}\``);
  }

  async fromTemplate(
    messageTypeDirCtx: MessageTypeDirContext,
    name: string,
    templateString: string,
  ): Promise<void> {
    // When being called from the template string, we want to try and generate
    // the message type from the provided template.
    spinner.start(
      `‣ Generating message type from template \`${templateString}\``,
    );

    try {
      await MessageType.generateMessageTypeFromTemplate(
        messageTypeDirCtx,
        templateString,
        {
          name,
        },
      );
    } catch (error) {
      this.error(`Failed to generate message type from template: ${error}`);
    } finally {
      spinner.stop();
    }
  }

  async fromScratch(
    messageTypeDirCtx: MessageTypeDirContext,
    name: string,
  ): Promise<void> {
    // Generate the message type directory with scaffolded content
    await MessageType.generateMessageTypeDir(messageTypeDirCtx, {
      name,
    });
  }

  async getMessageTypeDirContext(
    messageTypeKey?: string,
  ): Promise<MessageTypeDirContext> {
    const { resourceDir, cwd: runCwd } = this.runContext;

    // Inside an existing resource dir, use it if valid for the target message type.
    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: BaseCommand.id,
        type: "message_type",
        key: messageTypeKey,
      };

      return ensureResourceDirForTarget(
        resourceDir,
        target,
      ) as MessageTypeDirContext;
    }

    // Default to knock project config first if present, otherwise cwd.
    const dirCtx = await resolveResourceDir(
      this.projectConfig,
      "message_type",
      runCwd,
    );

    // Not inside any existing message type directory, which means either create a
    // new message type directory in the cwd, or update it if there is one already.
    if (messageTypeKey) {
      const dirPath = path.resolve(dirCtx.abspath, messageTypeKey);
      const exists = await MessageType.isMessageTypeDir(dirPath);

      return {
        type: "message_type",
        key: messageTypeKey,
        abspath: dirPath,
        exists,
      };
    }

    // Not in any message type directory, nor a message type key arg was given so error.
    return this.error("Missing 1 required arg:\nmessageTypeKey");
  }
}
