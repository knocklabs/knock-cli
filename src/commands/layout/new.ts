import * as path from "node:path";

import { Flags } from "@oclif/core";
import { prompt } from "enquirer";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import * as CustomFlags from "@/lib/helpers/flag";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import { slugify } from "@/lib/helpers/string";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as EmailLayout from "@/lib/marshal/email-layout";
import {
  EmailLayoutDirContext,
  ensureResourceDirForTarget,
  ResourceTarget,
} from "@/lib/run-context";

import EmailLayoutPush from "./push";

export default class EmailLayoutNew extends BaseCommand<typeof EmailLayoutNew> {
  static summary = "Create a new email layout with a minimal configuration.";

  static flags = {
    name: Flags.string({
      summary: "The name of the email layout",
      char: "n",
    }),
    key: Flags.string({
      summary: "The key of the email layout",
      char: "k",
    }),
    environment: Flags.string({
      summary:
        "The environment to create the email layout in. Defaults to development.",
      default: KnockEnv.Development,
    }),
    branch: CustomFlags.branch,
    force: Flags.boolean({
      summary:
        "Force the creation of the email layout directory without confirmation.",
    }),
    push: Flags.boolean({
      summary:
        "Whether or not to push the email layout to Knock after creation.",
      default: false,
      char: "p",
    }),
    template: Flags.string({
      summary:
        "The template to use for the email layout. Should be `email-layouts/{key}`.",
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = this.props;
    const { resourceDir } = this.runContext;

    // 1. Ensure we aren't in any existing resource directory already.
    if (resourceDir) {
      return this.error(
        `Cannot create a new email layout inside an existing ${resourceDir.type} directory`,
      );
    }

    // 2. Prompt for name and key if not provided
    let name = flags.name;
    let key = flags.key;

    if (!name) {
      const nameResponse = await prompt<{ name: string }>({
        type: "input",
        name: "name",
        message: "Email layout name",
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Email layout name is required";
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
        message: "Email layout key (immutable slug)",
        initial: slugify(name),
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Email layout key is required";
          }

          const keyError = EmailLayout.validateEmailLayoutKey(value);
          if (keyError) {
            return `Invalid email layout key: ${keyError}`;
          }

          return true;
        },
      });
      key = keyResponse.key;
    }

    // Validate the email layout key
    const emailLayoutKeyError = EmailLayout.validateEmailLayoutKey(key);
    if (emailLayoutKeyError) {
      return this.error(
        `Invalid email layout key \`${key}\` (${emailLayoutKeyError})`,
      );
    }

    const emailLayoutDirCtx = await this.getEmailLayoutDirContext(key);

    const promptMessage = emailLayoutDirCtx.exists
      ? `Found \`${emailLayoutDirCtx.key}\` at ${emailLayoutDirCtx.abspath}, overwrite?`
      : `Create a new email layout directory \`${emailLayoutDirCtx.key}\` at ${emailLayoutDirCtx.abspath}?`;

    // Check if the email layout directory already exists, and prompt to confirm if not.
    const input = flags.force || (await promptToConfirm(promptMessage));
    if (!input) return;

    // Generate the email layout either from a template or from scratch
    await (flags.template
      ? this.fromTemplate(emailLayoutDirCtx, name, flags.template)
      : this.fromScratch(emailLayoutDirCtx, name));

    if (flags.push) {
      spinner.start("‣ Pushing email layout to Knock");

      try {
        await EmailLayoutPush.run([key]);
      } catch (error) {
        this.error(`Failed to push email layout to Knock: ${error}`);
      } finally {
        spinner.stop();
      }
    }

    this.log(`‣ Successfully created email layout \`${key}\``);
  }

  async fromTemplate(
    emailLayoutDirCtx: EmailLayoutDirContext,
    name: string,
    templateString: string,
  ): Promise<void> {
    // When being called from the template string, we want to try and generate
    // the email layout from the provided template.
    spinner.start(
      `‣ Generating email layout from template \`${templateString}\``,
    );

    try {
      await EmailLayout.generateEmailLayoutFromTemplate(
        emailLayoutDirCtx,
        templateString,
        {
          name,
        },
      );
    } catch (error) {
      this.error(`Failed to generate email layout from template: ${error}`);
    } finally {
      spinner.stop();
    }
  }

  async fromScratch(
    emailLayoutDirCtx: EmailLayoutDirContext,
    name: string,
  ): Promise<void> {
    // Generate the email layout directory with scaffolded content
    await EmailLayout.generateEmailLayoutDir(emailLayoutDirCtx, { name });
  }

  async getEmailLayoutDirContext(
    emailLayoutKey?: string,
  ): Promise<EmailLayoutDirContext> {
    const { resourceDir, cwd: runCwd } = this.runContext;

    // Inside an existing resource dir, use it if valid for the target email layout.
    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: BaseCommand.id,
        type: "email_layout",
        key: emailLayoutKey,
      };

      return ensureResourceDirForTarget(
        resourceDir,
        target,
      ) as EmailLayoutDirContext;
    }

    // Default to knock project config first if present, otherwise cwd.
    const dirCtx = await resolveResourceDir(
      this.projectConfig,
      "email_layout",
      runCwd,
    );

    // Not inside any existing email layout directory, which means either create a
    // new email layout directory in the cwd, or update it if there is one already.
    if (emailLayoutKey) {
      const dirPath = path.resolve(dirCtx.abspath, emailLayoutKey);
      const exists = await EmailLayout.isEmailLayoutDir(dirPath);

      return {
        type: "email_layout",
        key: emailLayoutKey,
        abspath: dirPath,
        exists,
      };
    }

    // Not in any email layout directory, nor an email layout key arg was given so error.
    return this.error("Missing 1 required arg:\nemailLayoutKey");
  }
}
