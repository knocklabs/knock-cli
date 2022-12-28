import { take } from "lodash";

import { WorkflowData, WorkflowStepData, StepType } from "./types";

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

const channelStepSummaryLines = (step: WorkflowStepData) => {
  if (step.type !== StepType.Channel) return [];

  const { channel_key, channel_group_key, template } = step;
  const variants = Object.entries(template).map(([_, variant]) => variant);

  return [
    channel_key && `Channel: ${channel_key}`,
    channel_group_key && `Channel group: ${channel_group_key}`,
    `Template: ${variants.length} variant(s)`,
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
    reqHeaders.length && `Headers: \n\t${reqHeaders.join("\n\t")}`,
    params.length && `Params: \n\t${params.join("\n\t")}`,
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

export const formatStatus = (workflow: WorkflowData): string => {
  return workflow.active ? "active" : "inactive";
};
