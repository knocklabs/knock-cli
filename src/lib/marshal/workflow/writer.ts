import * as path from "node:path";

import * as fs from "fs-extra";
import { cloneDeep, get, keyBy, set, unset } from "lodash";

import { isTestEnv, sandboxDir } from "@/lib/helpers/env";
import { AnyObj, omitDeep, split } from "@/lib/helpers/object";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { WorkflowDirContext } from "@/lib/run-context";

import { WORKFLOW_JSON } from "./helpers";
import { readWorkflowDir, validateTemplateFilePathFormat } from "./reader";
import { StepType, WorkflowData } from "./types";

const FILEPATH_MARKER = "@";

// Use double spaces instead of a tabs, so jsonlint error messages print nicely.
const DOUBLE_SPACES = "  ";

const buildTemplateFilePath = (
  stepRef: string,
  templateVariantRef: string,
  fileName: string,
  fileExt: string,
) => `${stepRef}/${templateVariantRef}.${fileName}.${fileExt}`.toLowerCase();

const buildObjPathToExtractableField = (
  stepRef: string,
  templateVariantRef: string,
  fieldName: string,
) => `${stepRef}.template.${templateVariantRef}.${fieldName}${FILEPATH_MARKER}`;

/*
 * Sanitize the workflow content into a format that's appropriate for reading
 * and writing, by stripping out any annotation fields and handling readonly
 * fields.
 */
const toWorkflowJson = (workflow: WorkflowData<WithAnnotation>): AnyObj => {
  // Move read only fields of a workflow under the dedicated field "__readonly".
  const readonlyFields = workflow.__annotation?.readonly_fields || [];
  const [readonly, remainder] = split(workflow, readonlyFields);

  const worklfowJson = { ...remainder, __readonly: readonly };

  // Strip out all schema annotations, so not to expose them to end users.
  return omitDeep(worklfowJson, ["__annotation"]);
};

/*
 * Parse a given workflow payload, and extract out any template contents where
 * necessary and mutate the workflow data accordingly so we end up with a
 * mapping of file contents by its relative path (aka workflow dir bundle) that
 * can be written into a file system as individual files.
 */
type WorkflowDirBundle = {
  [relpath: string]: string;
};

const buildWorkflowDirBundle = (
  remoteWorkflow: WorkflowData<WithAnnotation>,
  localWorkflow: AnyObj,
  workflowDirCtx: WorkflowDirContext,
): WorkflowDirBundle => {
  const bundle: WorkflowDirBundle = {};
  const mutWorkflow = cloneDeep(remoteWorkflow);

  const localWorkflowStepsByRef = keyBy(localWorkflow.steps || [], "ref");

  // For each channel step, extract out any template content into seperate
  // template files where appropriate.
  for (const step of mutWorkflow.steps) {
    if (step.type !== StepType.Channel) continue;
    if (!step.template) continue;

    for (const [templateVariantRef, templateVariant] of Object.entries(
      step.template,
    )) {
      const extractableFields =
        templateVariant.__annotation?.extractable_fields || {};

      for (const [
        fieldName,
        { default: extractByDefault, file_ext: fileExt },
      ] of Object.entries(extractableFields)) {
        // If this template variant doesn't have this field, then it's not
        // relevant so nothing more to do here.
        if (!(fieldName in templateVariant)) continue;

        // If this field is extracted in the local workflow, then always extract;
        // otherwise extract based on the field settings default.
        const extractedTemplateFilePath = get(
          localWorkflowStepsByRef,
          buildObjPathToExtractableField(
            step.ref,
            templateVariantRef,
            fieldName,
          ),
        );
        const isValidTemplateFilePath =
          Boolean(extractedTemplateFilePath) &&
          validateTemplateFilePathFormat(
            extractedTemplateFilePath,
            workflowDirCtx,
          );

        if (!isValidTemplateFilePath && !extractByDefault) continue;

        // Add the template content being extracted and its relative file
        // path within the workflow directory to the bundle.
        const relpath =
          extractedTemplateFilePath ||
          buildTemplateFilePath(
            step.ref,
            templateVariantRef,
            fieldName,
            fileExt,
          );
        const fieldContent = get(templateVariant, fieldName);
        set(bundle, [relpath], fieldContent);

        // Replace the extracted field content with the file path, and
        // append the @ suffix to the field name to mark it as such.
        set(templateVariant, [`${fieldName}${FILEPATH_MARKER}`], relpath);
        unset(templateVariant, fieldName);
      }
    }
  }

  // Finally, prepare the workflow data to be written into a workflow json file.
  return set(bundle, [WORKFLOW_JSON], toWorkflowJson(mutWorkflow));
};

/*
 * The main write function that takes the latest workflow from Knock (remote
 * workflow), and the same workflow from the local file system (local workflow,
 * if available), then writes the remote workflow into a workflow directory
 * with a reference of the local workflow.
 */
export const writeWorkflowDir = async (
  remoteWorkflow: WorkflowData<WithAnnotation>,
  workflowDirCtx: WorkflowDirContext,
): Promise<void> => {
  const workflowDirPath = isTestEnv
    ? path.join(sandboxDir, remoteWorkflow.key)
    : workflowDirCtx.abspath;

  try {
    // If the workflow directory exists on the file system (i.e. previously
    // pulled before), then read the workflow file to use as a reference.
    const [localWorkflow = {}] = workflowDirCtx.exists
      ? await readWorkflowDir(workflowDirPath)
      : [];

    const bundle = buildWorkflowDirBundle(
      remoteWorkflow,
      localWorkflow,
      workflowDirCtx,
    );

    const promises = Object.entries(bundle).map(([relpath, fileContent]) => {
      const filePath = path.join(workflowDirPath, relpath);

      return relpath === WORKFLOW_JSON
        ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
        : fs.outputFile(filePath, fileContent);
    });
    await Promise.all(promises);
  } catch (error) {
    await fs.remove(workflowDirPath);
    throw error;
  }
};
