import * as fs from "fs-extra";
import { cloneDeep, get, set, unset } from "lodash";

import { isTestEnv, sandboxDir } from "@/lib/helpers/env";
import { AnyObj, omitDeep, split } from "@/lib/helpers/object";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import { StepType, WorkflowData } from "./types";

const WORKFLOW_JSON = "workflow.json";
const FILEPATH_MARKER = "@";

type WorkflowDirBundle = {
  [relpath: string]: string;
};

const buildTemplateFilePath = (
  stepRef: string,
  templateVariantRef: string,
  fileName: string,
  fileExt: string,
) => `${stepRef}/${templateVariantRef}.${fileName}.${fileExt}`.toLowerCase();

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
const buildWorkflowDirBundle = (
  workflow: WorkflowData<WithAnnotation>,
): WorkflowDirBundle => {
  const bundle: WorkflowDirBundle = {};
  const mutWorkflow = cloneDeep(workflow);

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
        if (!(fieldName in templateVariant)) continue;
        if (!extractByDefault) continue;

        // Add the template content being extracted and its relative file
        // path within the workflow directory to the bundle.
        const relpath = buildTemplateFilePath(
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

export const writeWorkflowDir = async (
  workflow: WorkflowData<WithAnnotation>,
): Promise<void> => {
  const bundle = buildWorkflowDirBundle(workflow);

  // TODO: Need to be aware of the cwd context of a workflow, or a project etc.
  const cwd = isTestEnv ? sandboxDir : ".";
  const workflowDir = `${cwd}/${workflow.key}`;

  try {
    for (const [relpath, fileContent] of Object.entries(bundle)) {
      const filePath = `${workflowDir}/${relpath}`;

      relpath === WORKFLOW_JSON
        ? fs.outputJson(filePath, fileContent, { spaces: "\t" })
        : fs.outputFile(filePath, fileContent);
    }
  } catch (error) {
    await fs.remove(workflowDir);
    throw error;
  }
};
