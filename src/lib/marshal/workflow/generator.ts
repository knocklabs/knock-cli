import * as path from "node:path";

import { assign, get, zip } from "lodash";

import { FILEPATH_MARKER } from "@/lib/marshal/shared/const.isomorphic";
import { WorkflowDirContext } from "@/lib/run-context";

import { WORKFLOW_JSON, WorkflowDirBundle } from "./processor.isomorphic";
import { StepType, WorkflowStepData } from "./types";
import { writeWorkflowDirFromBundle } from "./writer";
import { Channel } from "@knocklabs/mgmt/resources/channels";

const newTemplateFilePath = (
  stepRef: string,
  fileName: string,
  fileExt: string,
): string => path.join(stepRef, `${fileName}.${fileExt}`).toLowerCase();

/*
 * Step scaffold functions for each step and channel type.
 *
 * Channel steps can have a second item in the return tuple for a workflow
 * directory bundle "fragment".
 */
type StepScaffoldFuncRet = [WorkflowStepData, WorkflowDirBundle];

const scaffoldDelayStep = (refSuffix: number): StepScaffoldFuncRet => {
  const scaffoldedStep: WorkflowStepData = {
    ref: `${StepType.Delay}_${refSuffix}`,
    type: StepType.Delay,
    settings: {
      delay_for: {
        unit: "seconds",
        value: 30,
      },
    },
  };

  return [scaffoldedStep, {}];
};

const scaffoldBatchStep = (refSuffix: number): StepScaffoldFuncRet => {
  const scaffoldedStep: WorkflowStepData = {
    ref: `${StepType.Batch}_${refSuffix}`,
    type: StepType.Batch,
    settings: {
      batch_order: "asc",
      batch_window_type: "sliding",
      batch_window: {
        unit: "seconds",
        value: 30,
      },
    },
  };

  return [scaffoldedStep, {}];
};

const scaffoldHttpFetchStep = (refSuffix: number): StepScaffoldFuncRet => {
  const scaffoldedStep: WorkflowStepData = {
    ref: `${StepType.HttpFetch}_${refSuffix}`,
    type: StepType.HttpFetch,
    settings: {
      method: "get",
      url: "https://example.com",
    },
  };

  return [scaffoldedStep, {}];
};

const scaffoldEmailChannelStep = (
  refSuffix: number,
  channels: Channel[],
): StepScaffoldFuncRet => {
  const stepRef = `email_${refSuffix}`;
  const templateFilePath = newTemplateFilePath(stepRef, "html_body", "html");
  const firstChannel = channels[0];

  const scaffoldedStep: WorkflowStepData = {
    ref: stepRef,
    type: StepType.Channel,
    channel_key: firstChannel ? firstChannel.key : "<EMAIL CHANNEL KEY>",
    template: {
      settings: {
        layout_key: "default",
      },
      subject: "You've got mail!",
      ["html_body" + FILEPATH_MARKER]: templateFilePath,
    },
  };

  const bundleFragment: WorkflowDirBundle = {
    [templateFilePath]: "<p>Hello, <strong>{{ recipient.name }}</strong>!</p>",
  };

  return [scaffoldedStep, bundleFragment];
};

const scaffoldInAppFeedChannelStep = (
  refSuffix: number,
  channels: Channel[],
): StepScaffoldFuncRet => {
  const stepRef = `in_app_feed_${refSuffix}`;
  const templateFilePath = newTemplateFilePath(stepRef, "markdown_body", "md");
  const firstChannel = channels[0];

  const scaffoldedStep: WorkflowStepData = {
    ref: stepRef,
    type: StepType.Channel,
    channel_key: firstChannel ? firstChannel.key : "<IN-APP-FEED CHANNEL KEY>",
    template: {
      action_url: "{{ vars.app_url }}",
      ["markdown_body" + FILEPATH_MARKER]: templateFilePath,
    },
  };

  const bundleFragment: WorkflowDirBundle = {
    [templateFilePath]: "Hello, **{{ recipient.name }}**!",
  };

  return [scaffoldedStep, bundleFragment];
};

const scaffoldSmsChannelStep = (
  refSuffix: number,
  channels: Channel[],
): StepScaffoldFuncRet => {
  const stepRef = `sms_${refSuffix}`;
  const templateFilePath = newTemplateFilePath(stepRef, "text_body", "txt");
  const firstChannel = channels[0];

  const scaffoldedStep: WorkflowStepData = {
    ref: stepRef,
    type: StepType.Channel,
    channel_key: firstChannel ? firstChannel.key : "<SMS CHANNEL KEY>",
    template: {
      ["text_body" + FILEPATH_MARKER]: templateFilePath,
    },
  };

  const bundleFragment: WorkflowDirBundle = {
    [templateFilePath]: "Hello, {{ recipient.name }}!",
  };

  return [scaffoldedStep, bundleFragment];
};

const scaffoldPushChannelStep = (
  refSuffix: number,
  channels: Channel[],
): StepScaffoldFuncRet => {
  const stepRef = `push_${refSuffix}`;
  const templateFilePath = newTemplateFilePath(stepRef, "text_body", "txt");
  const firstChannel = channels[0];

  const scaffoldedStep: WorkflowStepData = {
    ref: stepRef,
    type: StepType.Channel,
    channel_key: firstChannel ? firstChannel.key : "<PUSH CHANNEL KEY>",
    template: {
      settings: {
        delivery_type: "content",
      },
      ["text_body" + FILEPATH_MARKER]: templateFilePath,
    },
  };

  const bundleFragment: WorkflowDirBundle = {
    [templateFilePath]: "Hello, {{ recipient.name }}!",
  };

  return [scaffoldedStep, bundleFragment];
};

const scaffoldChatChannelStep = (
  refSuffix: number,
  channels: Channel[],
): StepScaffoldFuncRet => {
  const stepRef = `chat_${refSuffix}`;
  const templateFilePath = newTemplateFilePath(stepRef, "markdown_body", "md");
  const firstChannel = channels[0];

  const scaffoldedStep: WorkflowStepData = {
    ref: stepRef,
    type: StepType.Channel,
    channel_key: firstChannel ? firstChannel.key : "<CHAT CHANNEL KEY>",
    template: {
      ["markdown_body" + FILEPATH_MARKER]: templateFilePath,
    },
  };

  const bundleFragment: WorkflowDirBundle = {
    [templateFilePath]: "Hello, **{{ recipient.name }}**!",
  };

  return [scaffoldedStep, bundleFragment];
};

const STEP_TAGS = [
  "delay",
  "batch",
  "fetch",
  "email",
  "in-app-feed",
  "sms",
  "push",
  "chat",
] as const;

export const StepTagChoices = {
  delay: "Delay step",
  batch: "Batch step",
  fetch: "HTTP Fetch step",
  email: "Email channel step",
  "in-app-feed": "In-app feed channel step",
  sms: "SMS channel step",
  push: "Push channel step",
  chat: "Chat channel step",
} as const;

export type StepTag = (typeof STEP_TAGS)[number];

type StepScaffoldFunc = (refSuffix: number) => StepScaffoldFuncRet;

type StepScaffoldChannelFunc = (
  refSuffix: number,
  channels: Channel[],
) => StepScaffoldFuncRet;

const stepScaffoldFuncs: Record<
  StepTag,
  StepScaffoldFunc | StepScaffoldChannelFunc
> = {
  // Function steps
  delay: scaffoldDelayStep,
  batch: scaffoldBatchStep,
  fetch: scaffoldHttpFetchStep,

  // Channel steps
  email: scaffoldEmailChannelStep,
  "in-app-feed": scaffoldInAppFeedChannelStep,
  sms: scaffoldSmsChannelStep,
  push: scaffoldPushChannelStep,
  chat: scaffoldChatChannelStep,
};

/*
 * Takes a comma seperated string of step tags, then parses and returns a list
 * of valid step tags.
 */
type ParseStepsInputResult = [StepTag[], undefined] | [undefined, string];

export const parseStepsInput = (
  input: string,
  availableStepTypes: StepTag[],
): ParseStepsInputResult => {
  const tags = input.split(",").filter((x) => x);

  const invalidTags = tags.filter(
    (tag) => !availableStepTypes.includes(tag as StepTag),
  );

  if (invalidTags.length > 0) {
    return [undefined, `Invalid step type: ${invalidTags.join(", ")}`];
  }

  return [tags as StepTag[], undefined];
};

export const getStepAvailableStepTypes = (channelTypes: Channel["type"][]) => {
  // Return a list of step
  return STEP_TAGS.filter((stepTag) => {
    switch (stepTag) {
      case "email":
        return channelTypes.includes("email");
      case "in-app-feed":
        return channelTypes.includes("in_app_feed");
      case "sms":
        return channelTypes.includes("sms");
      case "push":
        return channelTypes.includes("push");
      case "chat":
        return channelTypes.includes("chat");
      default:
        return true;
    }
  });
};

/*
 * Generates a new workflow directory with a scaffolded workflow.json file.
 * Assumes the given workflow directory context is valid and correct.
 */
type NewWorkflowAttrs = {
  name: string;
  steps?: StepTag[] | undefined;
};

const scaffoldWorkflowDirBundle = (
  attrs: NewWorkflowAttrs,
  channelsByType: Record<Channel["type"], Channel[]>,
): WorkflowDirBundle => {
  // A map of 1-based counters to track the number of each step tag seen, used
  // for formatting step refs.
  const stepCountByTag = assign({}, ...STEP_TAGS.map((tag) => ({ [tag]: 0 })));

  // Scaffold workflow steps data based on given step tags.
  const [scaffoldedSteps = [], bundleFragments = []] = zip(
    ...(attrs.steps || []).map((tag) => {
      const stepCount = ++stepCountByTag[tag];

      switch (tag) {
        case "email":
        case "sms":
        case "push":
        case "chat":
          return stepScaffoldFuncs[tag](
            stepCount,
            get(channelsByType, tag, []),
          );
        case "in-app-feed":
          return stepScaffoldFuncs[tag](
            stepCount,
            get(channelsByType, "in_app_feed", []),
          );
        default:
          console.log("default", tag);
          return (stepScaffoldFuncs[tag] as StepScaffoldFunc)(stepCount);
      }
    }),
  );

  // Build a workflow directory bundle with scaffolded steps data, plus other
  // workflow attributes.
  const workflowJson = { ...attrs, steps: scaffoldedSteps };
  return assign({ [WORKFLOW_JSON]: workflowJson }, ...bundleFragments);
};

export const generateWorkflowDir = async (
  workflowDirCtx: WorkflowDirContext,
  attrs: NewWorkflowAttrs,
  channelsByType: Record<Channel["type"], Channel[]>,
): Promise<void> => {
  const bundle = scaffoldWorkflowDirBundle(attrs, channelsByType);

  return writeWorkflowDirFromBundle(workflowDirCtx, bundle);
};

// Exported for tests.
export { scaffoldWorkflowDirBundle };
