import * as path from "node:path";

import * as fs from "fs-extra";
import { take } from "lodash";

import { checkSlugifiedFormat } from "@/lib/helpers/string";

import { StepType, WorkflowData, WorkflowStepData } from "./types";

export const WORKFLOW_JSON = "workflow.json";
export const VISUAL_BLOCKS_JSON = "visual_blocks.json";

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
  const workflowJsonPath = path.join(dirPath, WORKFLOW_JSON);

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
    batch_window: duration,
    batch_until_field_path: field_path,
    batch_order,
  } = step.settings;

  return [
    batch_key && `Batch key: ${batch_key}`,
    duration && `Batch window: ${duration.value} ${duration.unit}`,
    field_path && `Batch window: "${field_path}"`,
    `Batch order: ${batch_order}`,
  ];
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
