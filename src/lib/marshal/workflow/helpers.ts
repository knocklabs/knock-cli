import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";
import { take } from "lodash";

import { DirContext } from "@/lib/helpers/fs";
import { checkSlugifiedFormat } from "@/lib/helpers/string";
import { RunContext, WorkflowDirContext } from "@/lib/run-context";

import { StepType, WorkflowData, WorkflowStepData } from "./types";

export const WORKFLOW_JSON = "workflow.json";
export const VISUAL_BLOCKS_JSON = "visual_blocks.json";

export const workflowJsonPath = (workflowDirCtx: WorkflowDirContext): string =>
  path.resolve(workflowDirCtx.abspath, WORKFLOW_JSON);

// Mark any template fields we are extracting out with this suffix as a rule,
// so we can reliably interpret the field value.
// TODO: Move this up to a top level directory when re-used for other resources.
export const FILEPATH_MARKER = "@";
export const FILEPATH_MARKED_RE = new RegExp(`${FILEPATH_MARKER}$`);

/*
 * Validates a string input for a workflow key, and returns an error reason
 * if invalid.
 */
export const validateWorkflowKey = (input: string): string | undefined => {
  if (!checkSlugifiedFormat(input, { onlyLowerCase: true })) {
    return "must include only lowercase alphanumeric, dash, or underscore characters";
  }

  return undefined;
};

/*
 * Check for workflow.json file and return the file path if present.
 */
export const lsWorkflowJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const workflowJsonPath = path.resolve(dirPath, WORKFLOW_JSON);

  const exists = await fs.pathExists(workflowJsonPath);
  return exists ? workflowJsonPath : undefined;
};

/*
 * Evaluates whether the given directory path is a workflow directory, by
 * checking for the presence of workflow.json file.
 */
export const isWorkflowDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsWorkflowJson(dirPath));

/*
 * Returns a formatted string of workflow categories.
 */
type FormatCategoriesOpts = {
  truncateAfter?: number;
  emptyDisplay?: string;
};

export const formatCategories = (
  workflow: WorkflowData,
  opts: FormatCategoriesOpts = {},
): string => {
  const { categories } = workflow;
  const { truncateAfter: limit, emptyDisplay = "" } = opts;

  if (!categories) return emptyDisplay;

  const count = categories.length;
  if (!limit || limit >= count) return categories.join(", ");

  return take(categories, limit).join(", ") + ` (+ ${count - limit} more)`;
};

/*
 * Returns a formatted string of workflow steps.
 */
const channelStepSummaryLines = (step: WorkflowStepData) => {
  if (step.type !== StepType.Channel) return [];

  const { channel_key, channel_group_key } = step;

  return [
    channel_key && `Channel: ${channel_key}`,
    channel_group_key && `Channel group: ${channel_group_key}`,
  ].filter((x) => x);
};

const batchStepSummaryLines = (step: WorkflowStepData) => {
  if (step.type !== StepType.Batch) return [];

  const {
    batch_key,
    batch_window_type,
    batch_window: duration,
    batch_until_field_path: field_path,
    batch_order,
  } = step.settings;

  return [
    batch_key && `Batch key: ${batch_key}`,
    duration && `Batch window: ${duration.value} ${duration.unit}`,
    field_path && `Batch window: "${field_path}"`,
    `Batch window type: ${batch_window_type}`,
    `Batch order: ${batch_order}`,
  ];
};

const throttleStepSummaryLines = (step: WorkflowStepData) => {
  if (step.type !== StepType.Throttle) return [];

  const {
    throttle_key,
    throttle_window: duration,
    throttle_window_field_path: field_path,
    throttle_limit,
  } = step.settings;

  return [
    throttle_key && `Throttle key: ${throttle_key}`,
    duration && `Throttle window: ${duration.value} ${duration.unit}`,
    field_path && `Throttle window: "${field_path}"`,
    `Throttle limit: ${throttle_limit}`,
  ];
};

const ifElseStepSummaryLines = (step: WorkflowStepData) => {
  if (step.type !== StepType.IfElse) return [];

  let stepsCount = 0;

  for (const branch of step.branches) {
    stepsCount += doCountSteps(branch.steps);
  }

  return [`Branches: ${step.branches.length}`, `Steps: ${stepsCount}`];
};

const delayStepSummaryLines = (step: WorkflowStepData) => {
  if (step.type !== StepType.Delay) return [];

  const { delay_for: duration, delay_until_field_path: field_path } =
    step.settings;

  return [
    duration && `Delay duration: ${duration.value} ${duration.unit}`,
    field_path && `Delay duration: "${field_path}"`,
  ];
};

const httpFetchStepSummaryLines = (step: WorkflowStepData) => {
  if (step.type !== StepType.HttpFetch) return [];

  const { method, url, headers, query_params, body } = step.settings;
  const reqHeaders = (headers || []).map((h) => `${h.key}: ${h.value}`);
  const params = (query_params || []).map((p) => `${p.key}: ${p.value}`);

  return [
    `Method: ${method.toUpperCase()}`,
    `URL: ${url}`,
    reqHeaders.length > 0 && `Headers: \n  ${reqHeaders.join("\n  ")}`,
    params.length > 0 && `Params: \n  ${params.join("\n  ")}`,
    body && `Body: \n${body}`,
  ];
};

export const formatStepSummary = (step: WorkflowStepData): string => {
  const lines = [
    // Common step attributes.
    step.name && `Name: ${step.name}`,
    step.description && `Description: ${step.description}`,

    // Step type specific attributes.
    ...channelStepSummaryLines(step),
    ...batchStepSummaryLines(step),
    ...delayStepSummaryLines(step),
    ...httpFetchStepSummaryLines(step),
    ...ifElseStepSummaryLines(step),
    ...throttleStepSummaryLines(step),

    // Extra line between step rows to make it easier on the eye.
    " ",
  ].filter((x) => x);

  return lines.join("\n");
};

/*
 * Returns a formatted string of workflow status.
 */
export const formatStatus = (workflow: WorkflowData): string => {
  return workflow.active ? "active" : "inactive";
};

/*
 * Validate the provided args and flags with the current run context, to first
 * ensure the invoked command makes sense, and return the target context.
 */
type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "workflows-dir": DirContext | undefined;
  };
  args: {
    workflowKey: string | undefined;
  };
};
type WorkflowDirTarget = {
  type: "workflowDir";
  context: WorkflowDirContext;
};
type WorkflowsIndexDirTarget = {
  type: "workflowsIndexDir";
  context: DirContext;
};
export type WorkflowCommandTarget = WorkflowDirTarget | WorkflowsIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
): Promise<WorkflowCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  // If the target resource is a different type than the current resource dir
  // type, error out.
  if (resourceDirCtx && resourceDirCtx.type !== "workflow") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  // Cannot accept both workflow key arg and --all flag.
  if (flags.all && args.workflowKey) {
    return ux.error(
      `workflowKey arg \`${args.workflowKey}\` cannot also be provided when using --all`,
    );
  }

  // --all flag is given, which means no workflow key arg.
  if (flags.all) {
    // If --all flag used inside a workflow directory, then require a workflows
    // dir path.
    if (resourceDirCtx && !flags["workflows-dir"]) {
      return ux.error("Missing required flag workflows-dir");
    }

    // Targeting all workflow dirs in the workflows index dir.
    // TODO: Default to the knock project config first if present before cwd.
    const defaultToCwd = { abspath: runCwd, exists: true };
    const indexDirCtx = flags["workflows-dir"] || defaultToCwd;

    return { type: "workflowsIndexDir", context: indexDirCtx };
  }

  // Workflow key arg is given, which means no --all flag.
  if (args.workflowKey) {
    if (resourceDirCtx && resourceDirCtx.key !== args.workflowKey) {
      return ux.error(
        `Cannot run ${commandId} \`${args.workflowKey}\` inside another workflow directory:\n${resourceDirCtx.key}`,
      );
    }

    const targetDirPath = resourceDirCtx
      ? resourceDirCtx.abspath
      : path.resolve(runCwd, args.workflowKey);

    const workflowDirCtx: WorkflowDirContext = {
      type: "workflow",
      key: args.workflowKey,
      abspath: targetDirPath,
      exists: await isWorkflowDir(targetDirPath),
    };

    return { type: "workflowDir", context: workflowDirCtx };
  }

  // From this point on, we have neither a workflow key arg nor --all flag.
  // If running inside a workflow directory, then use that workflow directory.
  if (resourceDirCtx) {
    return { type: "workflowDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:\nworkflowKey");
};

const doCountSteps = (steps: WorkflowStepData[]): number => {
  let count = 0;

  for (const step of steps) {
    count += 1;

    if (step.type === StepType.IfElse) {
      for (const branch of step.branches) {
        count += doCountSteps(branch.steps);
      }
    }
  }

  return count;
};

export const countSteps = (workflow: WorkflowData): number =>
  doCountSteps(workflow.steps);
