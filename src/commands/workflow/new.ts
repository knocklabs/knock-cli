import * as path from "node:path";

import { Flags } from "@oclif/core";
import * as fs from "fs-extra";
import { prompt } from "enquirer";

import BaseCommand from "@/lib/base-command";
import { KnockEnv } from "@/lib/helpers/const";
import { spinner } from "@/lib/helpers/ux";
import * as Workflow from "@/lib/marshal/workflow";
import { WorkflowDirContext } from "@/lib/run-context";

import { slugify } from "@/lib/helpers/string";
import {
  parseStepsInput,
  StepTag,
  StepTagChoices,
} from "@/lib/marshal/workflow/generator";
import WorkflowPush from "./push";
import { Channel } from "@knocklabs/mgmt/resources/channels";

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
  };

  static args = {};

  async run(): Promise<void> {
    const { flags } = this.props;
    const { cwd, resourceDir } = this.runContext;

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

    // 3. Handle step selection
    let steps: StepTag[] = [];
    const channelsByType = await this.listAllChannelsByType();
    const channelTypes = Object.keys(channelsByType) as Channel["type"][];
    const availableStepTypes = Workflow.getStepAvailableStepTypes(channelTypes);

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

      if (!stepsResponse.steps || stepsResponse.steps.length === 0) {
        steps = [];
      } else {
        steps = stepsResponse.steps as StepTag[];
      }
    }

    // // 4. Validate the workflow key
    const workflowKeyError = Workflow.validateWorkflowKey(key);
    if (workflowKeyError) {
      return this.error(
        `Invalid workflow key \`${key}\` (${workflowKeyError})`,
      );
    }

    // // 5. Ensure not to overwrite any existing path accidentally.
    const newWorkflowDirPath = path.resolve(cwd, key);
    const pathExists = await fs.pathExists(newWorkflowDirPath);
    if (pathExists) {
      return this.error(
        `Cannot overwrite an existing path at ${newWorkflowDirPath}`,
      );
    }

    // // 6. Generate workflow with steps using the generator
    const dirContext: WorkflowDirContext = {
      type: "workflow",
      key: key,
      abspath: newWorkflowDirPath,
      exists: false,
    };

    // // Generate the workflow directory with scaffolded steps
    await Workflow.generateWorkflowDir(
      dirContext,
      {
        name,
        steps,
      },
      channelsByType,
    );

    // // 7. Push the workflow to Knock and update with the response
    spinner.start("‣ Pushing workflow to Knock");

    try {
      await WorkflowPush.run([key]);
    } catch (error) {
      this.error(`Failed to push workflow to Knock: ${error}`);
    }

    spinner.stop();

    // // 8. Display a success message.
    this.log(
      `‣ Successfully created workflow \`${key}\` at ${dirContext.abspath}`,
    );
  }

  async listAllChannelsByType() {
    const channels = await this.apiV1.listAllChannels();

    // Group channels by type
    const channelsByType = channels.reduce(
      (acc, channel) => ({
        ...acc,
        [channel.type]: (acc[channel.type] || []).concat(channel),
      }),
      {} as Record<Channel["type"], Channel[]>,
    );

    return channelsByType;
  }
}
