import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";
import { take } from "lodash";
import {
  FetchingJSONSchemaStore,
  InputData,
  JSONSchemaInput,
  quicktype,
  SerializedRenderResult,
} from "quicktype-core";

import { DirContext } from "@/lib/helpers/fs";
import {
  ProjectConfig,
  resolveResourceDir,
} from "@/lib/helpers/project-config";
import { checkSlugifiedFormat } from "@/lib/helpers/string";
import { SupportedTypeLanguage, transformSchema } from "@/lib/helpers/typegen";
import { RunContext, WorkflowDirContext } from "@/lib/run-context";

import { WORKFLOW_JSON } from "./processor.isomorphic";
import { StepType, WorkflowData, WorkflowStepData } from "./types";

export const workflowJsonPath = (workflowDirCtx: WorkflowDirContext): string =>
  path.resolve(workflowDirCtx.abspath, WORKFLOW_JSON);

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
    batch_window_extension_limit,
    batch_until_field_path: field_path,
    batch_order,
  } = step.settings;

  return [
    batch_key && `Batch key: ${batch_key}`,
    duration && `Batch window: ${duration.value} ${duration.unit}`,
    field_path && `Batch window: "${field_path}"`,
    `Batch window type: ${batch_window_type}`,
    batch_window_extension_limit &&
      `Batch window extension limit: ${batch_window_extension_limit.value} ${batch_window_extension_limit.unit}`,
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

const branchStepSummaryLines = (step: WorkflowStepData) => {
  if (step.type !== StepType.Branch) return [];

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
    ...branchStepSummaryLines(step),
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
  projectConfig?: ProjectConfig,
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
    // Default to knock project config first if present, otherwise cwd.
    const indexDirCtx = await resolveResourceDir(
      projectConfig,
      "workflow",
      runCwd,
    );

    return {
      type: "workflowsIndexDir",
      context: flags["workflows-dir"] || indexDirCtx,
    };
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

    if (step.type === StepType.Branch) {
      for (const branch of step.branches) {
        count += doCountSteps(branch.steps);
      }
    }
  }

  return count;
};

export const countSteps = (workflow: WorkflowData): number =>
  doCountSteps(workflow.steps);

/**
 * Given a set of workflows, will go through and generated types for each workflow.
 *
 * If the workflow has no trigger data JSON schema, will return empty lines.
 *
 * @param workflows List of workflows to generate types for
 * @param targetLanguage Target programming language for type generation
 * @returns Generated type definitions for the workflows
 */
export async function generateWorkflowTypes(
  workflows: WorkflowData[],
  targetLanguage: SupportedTypeLanguage,
): Promise<{
  result: SerializedRenderResult | undefined;
  workflows: WorkflowData[];
}> {
  const validWorkflows = workflows.filter(
    (workflow) => workflow.trigger_data_json_schema,
  );

  if (validWorkflows.length === 0) {
    return { result: undefined, workflows: [] };
  }

  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());

  for (const workflow of validWorkflows) {
    const pascalCaseWorkflowKey = workflow.key
      .split(/[_-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    const schema = transformSchema({
      ...workflow.trigger_data_json_schema,
      title: `${pascalCaseWorkflowKey}Data`,
    });

    schemaInput.addSource({
      name: `${pascalCaseWorkflowKey}Data`,
      schema: JSON.stringify(schema),
    });
  }

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  const result = await quicktype({
    inputData,
    lang: targetLanguage,
    allPropertiesOptional: false,
    alphabetizeProperties: true,
    rendererOptions: {
      "just-types": true,
      "no-extra-properties": true,
      "no-optional-null": true,
    },
  });

  return { result, workflows: validWorkflows };
}
