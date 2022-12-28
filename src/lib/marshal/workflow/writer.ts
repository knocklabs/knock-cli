import { get, set, unset, cloneDeep } from "lodash";
import * as fs from "fs-extra";

import { WithAnnotation } from "@/lib/marshal/types";
import { split, omitDeep, PlainObj } from "@/lib/helpers/object";

import { WorkflowData, StepType } from "./types";

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

const toWorkflowJson = (workflow: WorkflowData<WithAnnotation>): PlainObj => {
  // Move read only fields of a workflow under the dedicated field "__readonly".
  const readonlyFields = workflow.__annotation?.readonly_fields || [];
  const [readonly, remainder] = split(workflow, readonlyFields);

  const worklfowJson = { ...remainder, __readonly: readonly };

  // Strip out all schema annotations, so not to expose them to end users.
  return omitDeep(worklfowJson, ["__annotation"]);
};

const buildWorkflowDirBundle = (
  workflow: WorkflowData<WithAnnotation>,
): WorkflowDirBundle => {
  const bundle: WorkflowDirBundle = {};
  let mutWorkflow = cloneDeep(workflow);

  // For each channel step, extract out any template content into seperate
  // template files where appropriate.
  mutWorkflow.steps.forEach((step) => {
    if (step.type !== StepType.Channel) return;
    if (!step.template) return;

    Object.entries(step.template).forEach(
      ([templateVariantRef, templateVariant]) => {
        const extractableFields =
          templateVariant.__annotation?.extractable_fields || {};

        Object.entries(extractableFields).forEach(
          ([fieldName, { default: extractByDefault, file_ext: fileExt }]) => {
            if (!(fieldName in templateVariant)) return;
            if (!extractByDefault) return;

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
          },
        );
      },
    );
  });

  // Finally, prepare the workflow data to be written into a workflow json file.
  return set(bundle, [WORKFLOW_JSON], toWorkflowJson(mutWorkflow));
};

export const writeWorkflowDir = async (
  workflow: WorkflowData<WithAnnotation>,
) => {
  const bundle = buildWorkflowDirBundle(workflow);

  Object.entries(bundle).forEach(([relpath, fileContent]) => {
    const filePath = `./${workflow.key}/${relpath}`.toLowerCase();

    if (relpath === WORKFLOW_JSON) {
      fs.outputJson(filePath, fileContent, { spaces: "\t" });
    } else {
      fs.outputFile(filePath, fileContent);
    }
  });
};
