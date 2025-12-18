import * as path from "node:path";

import { Flags } from "@oclif/core";
import { prompt } from "enquirer";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import * as CustomFlags from "@/lib/helpers/flag";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import { slugify } from "@/lib/helpers/string";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Partial from "@/lib/marshal/partial";
import { PartialType } from "@/lib/marshal/partial";
import {
  ensureResourceDirForTarget,
  PartialDirContext,
  ResourceTarget,
} from "@/lib/run-context";

import PartialPush from "./push";

const PARTIAL_TYPE_CHOICES = [
  { name: PartialType.Html, message: "HTML" },
  { name: PartialType.Json, message: "JSON" },
  { name: PartialType.Markdown, message: "Markdown" },
  { name: PartialType.Text, message: "Text" },
] as const;

export default class PartialNew extends BaseCommand<typeof PartialNew> {
  static summary = "Create a new partial with a minimal configuration.";

  static flags = {
    name: Flags.string({
      summary: "The name of the partial",
      char: "n",
    }),
    key: Flags.string({
      summary: "The key of the partial",
      char: "k",
    }),
    type: Flags.string({
      summary:
        "The type of the partial (html, json, markdown, text). You cannot use this flag with --template.",
      char: "t",
      options: [
        PartialType.Html,
        PartialType.Json,
        PartialType.Markdown,
        PartialType.Text,
      ],
    }),
    environment: Flags.string({
      summary:
        "The environment to create the partial in. Defaults to development.",
      default: KnockEnv.Development,
    }),
    branch: CustomFlags.branch,
    force: Flags.boolean({
      summary:
        "Force the creation of the partial directory without confirmation.",
    }),
    push: Flags.boolean({
      summary: "Whether or not to push the partial to Knock after creation.",
      default: false,
      char: "p",
    }),
    template: Flags.string({
      summary:
        "The template to use for the partial. Should be `partials/{key}`. You cannot use this flag with --type.",
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = this.props;
    const { resourceDir } = this.runContext;

    // 1. Ensure we aren't in any existing resource directory already.
    if (resourceDir) {
      return this.error(
        `Cannot create a new partial inside an existing ${resourceDir.type} directory`,
      );
    }

    // 2. Prompt for name and key if not provided
    let name = flags.name;
    let key = flags.key;

    if (!name) {
      const nameResponse = await prompt<{ name: string }>({
        type: "input",
        name: "name",
        message: "Partial name",
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Partial name is required";
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
        message: "Partial key (immutable slug)",
        initial: slugify(name),
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Partial key is required";
          }

          const keyError = Partial.validatePartialKey(value);
          if (keyError) {
            return `Invalid partial key: ${keyError}`;
          }

          return true;
        },
      });
      key = keyResponse.key;
    }

    // Validate the partial key
    const partialKeyError = Partial.validatePartialKey(key);
    if (partialKeyError) {
      return this.error(`Invalid partial key \`${key}\` (${partialKeyError})`);
    }

    const partialDirCtx = await this.getPartialDirContext(key);

    const promptMessage = partialDirCtx.exists
      ? `Found \`${partialDirCtx.key}\` at ${partialDirCtx.abspath}, overwrite?`
      : `Create a new partial directory \`${partialDirCtx.key}\` at ${partialDirCtx.abspath}?`;

    // Check if the partial directory already exists, and prompt to confirm if not.
    const input = flags.force || (await promptToConfirm(promptMessage));
    if (!input) return;

    // Generate the partial either from a template or from scratch
    await (flags.template
      ? this.fromTemplate(partialDirCtx, name, flags.template)
      : this.fromType(
          partialDirCtx,
          name,
          flags.type as PartialType | undefined,
        ));

    if (flags.push) {
      spinner.start("‣ Pushing partial to Knock");

      try {
        await PartialPush.run([key]);
      } catch (error) {
        this.error(`Failed to push partial to Knock: ${error}`);
      } finally {
        spinner.stop();
      }
    }

    this.log(`‣ Successfully created partial \`${key}\``);
  }

  async fromTemplate(
    partialDirCtx: PartialDirContext,
    name: string,
    templateString: string,
  ): Promise<void> {
    // When being called from the template string, we want to try and generate
    // the partial from the provided template.
    spinner.start(`‣ Generating partial from template \`${templateString}\``);

    try {
      await Partial.generatePartialFromTemplate(partialDirCtx, templateString, {
        name,
      });
    } catch (error) {
      this.error(`Failed to generate partial from template: ${error}`);
    } finally {
      spinner.stop();
    }

    spinner.stop();
  }

  async fromType(
    partialDirCtx: PartialDirContext,
    name: string,
    type: PartialType | undefined,
  ): Promise<void> {
    let partialType: PartialType;

    if (type) {
      partialType = type;
    } else {
      // Prompt for type with select
      const typeResponse = await prompt<{ type: string }>({
        type: "select",
        name: "type",
        message: "Select partial type",
        choices: PARTIAL_TYPE_CHOICES.map((choice) => ({
          name: choice.name,
          message: choice.message,
        })),
      });

      partialType = typeResponse.type as PartialType;
    }

    // Generate the partial directory with scaffolded content
    await Partial.generatePartialDir(partialDirCtx, {
      name,
      type: partialType,
    });
  }

  async getPartialDirContext(partialKey?: string): Promise<PartialDirContext> {
    const { resourceDir, cwd: runCwd } = this.runContext;

    // Inside an existing resource dir, use it if valid for the target partial.
    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: BaseCommand.id,
        type: "partial",
        key: partialKey,
      };

      return ensureResourceDirForTarget(
        resourceDir,
        target,
      ) as PartialDirContext;
    }

    // Default to knock project config first if present, otherwise cwd.
    const dirCtx = await resolveResourceDir(
      this.projectConfig,
      "partial",
      runCwd,
    );

    // Not inside any existing partial directory, which means either create a
    // new partial directory in the cwd, or update it if there is one already.
    if (partialKey) {
      const dirPath = path.resolve(dirCtx.abspath, partialKey);
      const exists = await Partial.isPartialDir(dirPath);

      return {
        type: "partial",
        key: partialKey,
        abspath: dirPath,
        exists,
      };
    }

    // Not in any partial directory, nor a partial key arg was given so error.
    return this.error("Missing 1 required arg:\npartialKey");
  }
}
