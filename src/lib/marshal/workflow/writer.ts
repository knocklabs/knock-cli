import * as path from "node:path";

import * as fs from "fs-extra";
import { cloneDeep, get, keyBy, set, unset } from "lodash";

import { WorkflowDirContext } from "@/lib/helpers/dir-context";
import { isTestEnv, sandboxDir } from "@/lib/helpers/env";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { AnyObj, omitDeep, split } from "@/lib/helpers/object";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import { FILEPATH_MARKER, WORKFLOW_JSON } from "./helpers";
import { readWorkflowDir, validateTemplateFilePathFormat } from "./reader";
import { StepType, WorkflowData } from "./types";

/*
 * For a given workflow step, a template variant, and a template field, return
 * the template file path we can extract out the content to.
 *
 * Note, this is a default "recommended" convention but the template file can
 * be located at any arbitrary path (as long as it is a relative path that is
 * inside the workflow directory and unique to the field)
 */
const newTemplateFilePath = (
  stepRef: string,
  templateVariantRef: string,
  fileName: string,
  fileExt: string,
) =>
  path
    .join(stepRef, `${templateVariantRef}.${fileName}.${fileExt}`)
    .toLowerCase();

/*
 * For a given workflow step, a template variant, and a template field, return
 * the path of object which we can use to check whether the field has been
 * extracted (hence, with the filepath marker).
 */
const objPathToExtractableField = (
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
  workflowDirCtx: WorkflowDirContext,
  remoteWorkflow: WorkflowData<WithAnnotation>,
  localWorkflow: AnyObj = {},
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
          objPathToExtractableField(step.ref, templateVariantRef, fieldName),
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
          newTemplateFilePath(step.ref, templateVariantRef, fieldName, fileExt);
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
 * with the local workflow as a reference.
 */
export const writeWorkflowDir = async (
  remoteWorkflow: WorkflowData<WithAnnotation>,
  workflowDirCtx: WorkflowDirContext,
): Promise<void> => {
  // If the workflow directory exists on the file system (i.e. previously
  // pulled before), then read the workflow file to use as a reference.
  const [localWorkflow] = workflowDirCtx.exists
    ? await readWorkflowDir(workflowDirCtx)
    : [];

  const bundle = buildWorkflowDirBundle(
    workflowDirCtx,
    remoteWorkflow,
    localWorkflow,
  );

  const workflowDirPath = isTestEnv
    ? path.join(sandboxDir, remoteWorkflow.key)
    : workflowDirCtx.abspath;

  try {
    const promises = Object.entries(bundle).map(([relpath, fileContent]) => {
      const filePath = path.join(workflowDirPath, relpath);

      return relpath === WORKFLOW_JSON
        ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
        : fs.outputFile(filePath, fileContent);
    });
    await Promise.all(promises);

    // TODO(KNO-2794): Probably need to clean up any orphaned template files
    // after successfully writing the workflow directory?
  } catch (error) {
    await fs.remove(workflowDirPath);
    throw error;
  }
};

// Exported for tests.
export { buildWorkflowDirBundle, toWorkflowJson };
