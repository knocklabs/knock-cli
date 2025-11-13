import * as path from "node:path";

import { Channel } from "@knocklabs/mgmt/resources/channels";
import { Flags } from "@oclif/core";
import { prompt } from "enquirer";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import { slugify } from "@/lib/helpers/string";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Workflow from "@/lib/marshal/workflow";
import {
  parseStepsInput,
  StepTag,
  StepTagChoices,
} from "@/lib/marshal/workflow/generator";
import {
  ensureResourceDirForTarget,
  ResourceTarget,
  WorkflowDirContext,
} from "@/lib/run-context";

import WorkflowPush from "./push";

export default class WorkflowNew extends BaseCommand<typeof WorkflowNew> {
  static summary = "Create a new workflow with a minimal configuration.";

  static flags = {
    name: Flags.string({
      summary: "The name of the workflow",
      char: "n",
    }),
    key: Flags.string({
      summary: "The key of the workflow",
      char: "k",
    }),
    steps: Flags.string({
      summary: "Comma-separated list of step types to include in the workflow",
      char: "s",
    }),
    environment: Flags.string({
      summary:
        "The environment to create the workflow in. Defaults to development.",
      default: KnockEnv.Development,
    }),
    force: Flags.boolean({
      summary:
        "Force the creation of the workflow directory without confirmation.",
    }),
    push: Flags.boolean({
      summary: "Whether or not to push the workflow to Knock after creation.",
      default: false,
      char: "p",
    }),
    template: Flags.string({
      summary:
        "The template to use for the workflow. You cannot use this flag with --steps.",
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
        `Cannot create a new workflow inside an existing ${resourceDir.type} directory`,
      );
    }

    // 2. Prompt for name and key if not provided
    let name = flags.name;
    let key = flags.key;

    if (!name) {
      const nameResponse = await prompt<{ name: string }>({
        type: "input",
        name: "name",
        message: "Workflow name",
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Workflow name is required";
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
        message: "Workflow key (immutable slug)",
        initial: slugify(name),
        validate: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "Workflow key is required";
          }

          const keyError = Workflow.validateWorkflowKey(value);
          if (keyError) {
            return `Invalid workflow key: ${keyError}`;
          }

          return true;
        },
      });
      key = keyResponse.key;
    }

    // Validate the workflow key
    const workflowKeyError = Workflow.validateWorkflowKey(key);
    if (workflowKeyError) {
      return this.error(
        `Invalid workflow key \`${key}\` (${workflowKeyError})`,
      );
    }

    const workflowDirCtx = await this.getWorkflowDirContext(key);

    // Check if the workflow directory already exists, and prompt to confirm if not.
    if (workflowDirCtx.exists) {
      this.log(
        `‣ Found \`${workflowDirCtx.key}\` at ${workflowDirCtx.abspath}`,
      );
    } else {
      const prompt = `Create a new workflow directory \`${workflowDirCtx.key}\` at ${workflowDirCtx.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    }

    // Generate the workflow either from a template or from scratch
    await (flags.template
      ? this.fromTemplate(workflowDirCtx, name, flags.template)
      : this.fromEmpty(workflowDirCtx, name));

    if (flags.push) {
      spinner.start("‣ Pushing workflow to Knock");

      try {
        await WorkflowPush.run([key]);
      } catch (error) {
        this.error(`Failed to push workflow to Knock: ${error}`);
      } finally {
        spinner.stop();
      }
    }

    this.log(`‣ Successfully created workflow \`${key}\``);
  }

  async fromTemplate(
    workflowDirCtx: WorkflowDirContext,
    name: string,
    templateString: string,
  ): Promise<void> {
    // When being called from the template string, we want to try and generate
    // the workflow from the provided template.
    const channelsByType = await this.listAllChannelsByType();

    spinner.start(`‣ Generating workflow from template \`${templateString}\``);

    try {
      await Workflow.generateWorkflowFromTemplate(
        workflowDirCtx,
        templateString,
        { name },
        channelsByType,
      );
    } catch (error) {
      this.error(`Failed to generate workflow from template: ${error}`);
    } finally {
      spinner.stop();
    }

    spinner.stop();
  }

  async fromEmpty(
    workflowDirCtx: WorkflowDirContext,
    name: string,
  ): Promise<void> {
    const { flags } = this.props;

    const channelsByType = await this.listAllChannelsByType();
    const channelTypes = Object.keys(channelsByType) as Channel["type"][];
    const availableStepTypes = Workflow.getStepAvailableStepTypes(channelTypes);

    let steps: StepTag[] = [];

    // Stuff with steps
    if (flags.steps) {
      // Parse steps from flag
      const [parsedSteps, stepsError] = parseStepsInput(
        flags.steps,
        availableStepTypes,
      );
      if (stepsError) {
        return this.error(`Invalid --steps \`${flags.steps}\` (${stepsError})`);
      }

      steps = parsedSteps || [];
    } else {
      // Prompt for steps with multiselect
      const stepChoices = availableStepTypes.map((stepType) => ({
        name: stepType,
        message: StepTagChoices[stepType],
      }));

      const stepsResponse = await prompt<{ steps: string[] }>({
        type: "multiselect",
        name: "steps",
        message: "(optional) Select step types to bootstrap the workflow with",
        choices: stepChoices,
      });

      steps =
        !stepsResponse.steps || stepsResponse.steps.length === 0
          ? []
          : (stepsResponse.steps as StepTag[]);
    }

    // 6. Generate the workflow directory with scaffolded steps
    await Workflow.generateWorkflowDir(
      workflowDirCtx,
      {
        name,
        steps,
      },
      channelsByType,
    );
  }

  async getWorkflowDirContext(
    workflowKey?: string,
  ): Promise<WorkflowDirContext> {
    const { resourceDir, cwd: runCwd } = this.runContext;

    // Inside an existing resource dir, use it if valid for the target workflow.
    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: BaseCommand.id,
        type: "workflow",
        key: workflowKey,
      };

      return ensureResourceDirForTarget(
        resourceDir,
        target,
      ) as WorkflowDirContext;
    }

    // Default to knock project config first if present, otherwise cwd.
    const dirCtx = await resolveResourceDir(
      this.projectConfig,
      "workflow",
      runCwd,
    );

    // Not inside any existing workflow directory, which means either create a
    // new worfklow directory in the cwd, or update it if there is one already.
    if (workflowKey) {
      const dirPath = path.resolve(dirCtx.abspath, workflowKey);
      const exists = await Workflow.isWorkflowDir(dirPath);

      return {
        type: "workflow",
        key: workflowKey,
        abspath: dirPath,
        exists,
      };
    }

    // Not in any workflow directory, nor a workflow key arg was given so error.
    return this.error("Missing 1 required arg:\nworkflowKey");
  }

  async listAllChannelsByType(): Promise<Record<Channel["type"], Channel[]>> {
    const channels = await this.apiV1.listAllChannels();

    // Group channels by type
    // eslint-disable-next-line unicorn/no-array-reduce
    const channelsByType = channels.reduce(
      (acc, channel) => ({
        ...acc,
        [channel.type]: [...(acc[channel.type] || []), channel],
      }),
      {} as Record<Channel["type"], Channel[]>,
    );

    return channelsByType;
  }
}
