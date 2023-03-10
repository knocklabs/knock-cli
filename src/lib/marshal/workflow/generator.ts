import { assign, get, zip } from "lodash";

import { WorkflowDirContext } from "@/lib/run-context";

import { FILEPATH_MARKER, WORKFLOW_JSON } from "./helpers";
import { StepType, WorkflowStepData } from "./types";
import {
  newTemplateFilePath,
  WorkflowDirBundle,
  writeWorkflowDirFromBundle,
} from "./writer";

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

const scaffoldEmailChannelStep = (refSuffix: number): StepScaffoldFuncRet => {
  const stepRef = `email_${refSuffix}`;
  const templateFilePath = newTemplateFilePath(stepRef, "html_body", "html");

  const scaffoldedStep: WorkflowStepData = {
    ref: stepRef,
    type: StepType.Channel,
    channel_key: "<EMAIL CHANNEL KEY>",
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
): StepScaffoldFuncRet => {
  const stepRef = `in_app_feed_${refSuffix}`;
  const templateFilePath = newTemplateFilePath(stepRef, "markdown_body", "md");

  const scaffoldedStep: WorkflowStepData = {
    ref: stepRef,
    type: StepType.Channel,
    channel_key: "<IN-APP-FEED CHANNEL KEY>",
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

const scaffoldSmsChannelStep = (refSuffix: number): StepScaffoldFuncRet => {
  const stepRef = `sms_${refSuffix}`;
  const templateFilePath = newTemplateFilePath(stepRef, "text_body", "txt");

  const scaffoldedStep: WorkflowStepData = {
    ref: stepRef,
    type: StepType.Channel,
    channel_key: "<SMS CHANNEL KEY>",
    template: {
      ["text_body" + FILEPATH_MARKER]: templateFilePath,
    },
  };

  const bundleFragment: WorkflowDirBundle = {
    [templateFilePath]: "Hello, {{ recipient.name }}!",
  };

  return [scaffoldedStep, bundleFragment];
};

const scaffoldPushChannelStep = (refSuffix: number): StepScaffoldFuncRet => {
  const stepRef = `push_${refSuffix}`;
  const templateFilePath = newTemplateFilePath(stepRef, "text_body", "txt");

  const scaffoldedStep: WorkflowStepData = {
    ref: stepRef,
    type: StepType.Channel,
    channel_key: "<PUSH CHANNEL KEY>",
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

const scaffoldChatChannelStep = (refSuffix: number): StepScaffoldFuncRet => {
  const stepRef = `chat_${refSuffix}`;
  const templateFilePath = newTemplateFilePath(stepRef, "markdown_body", "md");

  const scaffoldedStep: WorkflowStepData = {
    ref: stepRef,
    type: StepType.Channel,
    channel_key: "<CHAT CHANNEL KEY>",
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
  "in-app",
  "sms",
  "push",
  "chat",
] as const;

export type StepTag = (typeof STEP_TAGS)[number];
type StepScaffoldFunc = (refSuffix: number) => StepScaffoldFuncRet;

const stepScaffoldFuncs: Record<StepTag, StepScaffoldFunc> = {
  // Function steps
  delay: scaffoldDelayStep,
  batch: scaffoldBatchStep,
  fetch: scaffoldHttpFetchStep,

  // Channel steps
  email: scaffoldEmailChannelStep,
  "in-app": scaffoldInAppFeedChannelStep,
  sms: scaffoldSmsChannelStep,
  push: scaffoldPushChannelStep,
  chat: scaffoldChatChannelStep,
};

/*
 * Takes a comma seperated string of step tags, then parses and returns a list
 * of valid step tags.
 */
type ParseStepsInputResult = [StepTag[], undefined] | [undefined, string];

export const parseStepsInput = (input: string): ParseStepsInputResult => {
  const tags = input.split(",").filter((x) => x);

  const invalidTags = tags.filter((tag) => !get(stepScaffoldFuncs, tag));
  if (invalidTags.length > 0) {
    return [
      undefined,
      "must be a comma-separated string of the following values: " +
        STEP_TAGS.join(", "),
    ];
  }

  return [tags as StepTag[], undefined];
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
): WorkflowDirBundle => {
  // A map of 1-based counters to track the number of each step tag seen, used
  // for formatting step refs.
  const stepCountByTag = assign({}, ...STEP_TAGS.map((tag) => ({ [tag]: 0 })));

  // Scaffold workflow steps data based on given step tags.
  const [scaffoldedSteps = [], bundleFragments = []] = zip(
    ...(attrs.steps || []).map((tag) => {
      const stepCount = ++stepCountByTag[tag];
      return stepScaffoldFuncs[tag](stepCount);
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
): Promise<void> => {
  const bundle = scaffoldWorkflowDirBundle(attrs);

  return writeWorkflowDirFromBundle(workflowDirCtx, bundle);
};

// Exported for tests.
export { scaffoldWorkflowDirBundle };
