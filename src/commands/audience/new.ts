import * as path from "node:path";

import { Flags } from "@oclif/core";
import { prompt } from "enquirer";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import * as CustomFlags from "@/lib/helpers/flag";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import { slugify } from "@/lib/helpers/string";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Audience from "@/lib/marshal/audience";
import { AudienceType } from "@/lib/marshal/audience";
import { AudienceDirContext } from "@/lib/run-context";

import AudiencePush from "./push";

const AUDIENCE_TYPE_CHOICES = [
  { name: AudienceType.Static, message: "Static (manual membership)" },
  {
    name: AudienceType.Dynamic,
    message: "Dynamic (rule-based membership) [Beta - requires access]",
  },
] as const;

export default class AudienceNew extends BaseCommand<typeof AudienceNew> {
  static summary = "Create a new audience with a minimal configuration.";

  static flags = {
    name: Flags.string({
      summary: "The name of the audience",
      char: "n",
    }),
    key: Flags.string({
      summary: "The key of the audience",
      char: "k",
    }),
    type: Flags.string({
      summary:
        "The type of the audience (static, dynamic). Note: dynamic is in beta and requires access.",
      char: "t",
      options: [AudienceType.Static, AudienceType.Dynamic],
    }),
    description: Flags.string({
      summary: "The description of the audience",
      char: "d",
    }),
    environment: Flags.string({
      summary:
        "The environment to create the audience in. Defaults to development.",
      default: KnockEnv.Development,
    }),
    branch: CustomFlags.branch,
    force: Flags.boolean({
      summary:
        "Force the creation of the audience directory without confirmation.",
    }),
    push: Flags.boolean({
      summary: "Whether or not to push the audience to Knock after creation.",
      default: false,
      char: "p",
    }),
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = this.props;
    const { resourceDir } = this.runContext;

    // 1. Ensure we aren't in any existing resource directory already.
    if (resourceDir) {
      return this.error(
        `Cannot create a new audience inside an existing ${resourceDir.type} directory`,
      );
    }

    // 2. Prompt for name and key if not provided
    let name = flags.name;
    let key = flags.key;

    if (!name) {
      const nameResponse = await prompt<{ name: string }>({
        type: "input",
        name: "name",
        message: "Audience name",
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Audience name is required";
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
        message: "Audience key (immutable slug)",
        initial: slugify(name),
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Audience key is required";
          }

          const keyError = Audience.validateAudienceKey(value);
          if (keyError) {
            return `Invalid audience key: ${keyError}`;
          }

          return true;
        },
      });
      key = keyResponse.key;
    }

    // Validate the audience key
    const audienceKeyError = Audience.validateAudienceKey(key);
    if (audienceKeyError) {
      return this.error(
        `Invalid audience key \`${key}\` (${audienceKeyError})`,
      );
    }

    const audienceDirCtx = await this.getAudienceDirContext(key);

    const promptMessage = audienceDirCtx.exists
      ? `Found \`${audienceDirCtx.key}\` at ${audienceDirCtx.abspath}, overwrite?`
      : `Create a new audience directory \`${audienceDirCtx.key}\` at ${audienceDirCtx.abspath}?`;

    // Check if the audience directory already exists, and prompt to confirm if not.
    const input = flags.force || (await promptToConfirm(promptMessage));
    if (!input) return;

    // 3. Prompt for type if not provided
    let audienceType: AudienceType;

    if (flags.type) {
      audienceType = flags.type as AudienceType;
    } else {
      const typeResponse = await prompt<{ type: string }>({
        type: "select",
        name: "type",
        message: "Select audience type",
        choices: AUDIENCE_TYPE_CHOICES.map((choice) => ({
          name: choice.name,
          message: choice.message,
        })),
      });

      audienceType = typeResponse.type as AudienceType;
    }

    // Generate the audience directory with scaffolded content
    await Audience.generateAudienceDir(audienceDirCtx, {
      name,
      type: audienceType,
      description: flags.description,
    });

    if (flags.push) {
      spinner.start("‣ Pushing audience to Knock");

      const pushArgs = [key, "--environment", flags.environment];
      if (flags.branch) {
        pushArgs.push("--branch", flags.branch);
      }

      try {
        await AudiencePush.run(pushArgs);
      } catch (error) {
        this.error(`Failed to push audience to Knock: ${error}`);
      } finally {
        spinner.stop();
      }
    }

    this.log(`‣ Successfully created audience \`${key}\``);
  }

  async getAudienceDirContext(
    audienceKey?: string,
  ): Promise<AudienceDirContext> {
    const { cwd: runCwd } = this.runContext;

    // Default to knock project config first if present, otherwise cwd.
    const dirCtx = await resolveResourceDir(
      this.projectConfig,
      "audience",
      runCwd,
    );

    // Not inside any existing audience directory, which means either create a
    // new audience directory in the cwd, or update it if there is one already.
    if (audienceKey) {
      const dirPath = path.resolve(dirCtx.abspath, audienceKey);
      const exists = await Audience.isAudienceDir(dirPath);

      return {
        type: "audience",
        key: audienceKey,
        abspath: dirPath,
        exists,
      };
    }

    // Not in any audience directory, nor an audience key arg was given so error.
    return this.error("Missing 1 required arg:\naudienceKey");
  }
}
