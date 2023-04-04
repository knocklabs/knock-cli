import * as path from "node:path";

import * as fs from "fs-extra";
import { cloneDeep, get, has, keyBy, set, uniqueId, unset } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { AnyObj, omitDeep, split } from "@/lib/helpers/object";
import { ExtractionSettings, WithAnnotation } from "@/lib/marshal/shared/types";
import { WorkflowDirContext } from "@/lib/run-context";

import { FILEPATH_MARKER, isWorkflowDir, WORKFLOW_JSON } from "./helpers";
import { readWorkflowDir, validateTemplateFilePathFormat } from "./reader";
import { StepType, TemplateData, WorkflowData } from "./types";

export type WorkflowDirBundle = {
  [relpath: string]: string;
};

/*
 * For a given workflow step and a template field, return the template file path
 * we can extract out the content to.
 *
 * Note, this is a default "recommended" convention but the template file can
 * be located at any arbitrary path (as long as it is a relative path that is
 * inside the workflow directory and unique to the field)
 */
export const newTemplateFilePath = (
  stepRef: string,
  fileName: string,
  fileExt: string,
): string => path.join(stepRef, `${fileName}.${fileExt}`).toLowerCase();

/*
 * For a given workflow step and a template field, return the path of object
 * which we can use to check whether the field has been extracted (hence, with
 * the filepath marker).
 */
const objPathToExtractableField = (
  stepRef: string,
  pathToFieldInTemplate: string,
): string => `${stepRef}.template.${pathToFieldInTemplate}${FILEPATH_MARKER}`;

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
 * Compile and return extractable fields settings from the template and its
 * template settings if present.
 *
 * For example, for a channel step like this:
 *   {
 *     ref: "email_1",
 *     type: "channel",
 *     channel_key: "email-provider",
 *     template: {
 *       settings: {
 *         layout_key: "default",
 *         __annotation: {
 *           extractable_fields: {
 *             pre_content: { default: true, file_ext: "txt" },
 *           },
 *           readonly_fields: [],
 *         },
 *       },
 *       subject: "New activity",
 *       html_body: "<p>Hi <strong>{{ recipient.name }}</strong>.</p>",
 *       __annotation: {
 *         extractable_fields: {
 *           subject: { default: false, file_ext: "txt" },
 *           json_body: { default: true, file_ext: "json" },
 *           html_body: { default: true, file_ext: "html" },
 *           text_body: { default: true, file_ext: "txt" },
 *         },
 *         readonly_fields: [],
 *       },
 *     },
 *   }
 *
 * Takes the template data and returns a merged map of extractable fields like
 * this:
 *
 *   {
 *     subject: { default: false, file_ext: "txt" },
 *     json_body: { default: true, file_ext: "json" },
 *     html_body: { default: true, file_ext: "html" },
 *     text_body: { default: true, file_ext: "txt" },
 *     settings.pre_content: { default: true, file_ext: "txt" },
 *   }
 */
const collateExtractableFields = (
  template: TemplateData<WithAnnotation>,
): Record<string, ExtractionSettings> => {
  const extractableFields = template.__annotation?.extractable_fields || {};
  if (!template.settings) return extractableFields;

  // If the template has template settings, then merge in the extractable fields
  // for the template settings (with the field names prefixed with "settings.")
  let settingsExtractableFields =
    template.settings.__annotation?.extractable_fields || {};

  settingsExtractableFields = Object.fromEntries(
    Object.entries(settingsExtractableFields).map(([key, val]) => [
      `settings.${key}`,
      val,
    ]),
  );

  return { ...extractableFields, ...settingsExtractableFields };
};

/*
 * Parse a given workflow payload, and extract out any template contents where
 * necessary and mutate the workflow data accordingly so we end up with a
 * mapping of file contents by its relative path (aka workflow dir bundle) that
 * can be written into a file system as individual files.
 */
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

    const template = step.template;
    const extractableFields = collateExtractableFields(template);

    for (const [
      pathToField,
      { default: extractByDefault, file_ext: fileExt },
    ] of Object.entries(extractableFields)) {
      // If this template doesn't have this path, then it's not relevant so
      // nothing more to do here.
      if (!has(template, pathToField)) continue;

      // If the field at this path is extracted in the local workflow, then
      // always extract; otherwise extract based on the field settings default.
      const extractedTemplateFilePath = get(
        localWorkflowStepsByRef,
        objPathToExtractableField(step.ref, pathToField),
      );

      const isValidTemplateFilePath =
        Boolean(extractedTemplateFilePath) &&
        validateTemplateFilePathFormat(
          extractedTemplateFilePath,
          workflowDirCtx,
        );

      if (!isValidTemplateFilePath && !extractByDefault) continue;

      // Add the template content being extracted and its relative file path
      // within the workflow directory to the bundle.
      const relpath =
        extractedTemplateFilePath ||
        newTemplateFilePath(step.ref, pathToField, fileExt);

      set(bundle, [relpath], get(template, pathToField));

      // Replace the extracted field content with the file path, and
      // append the @ suffix to the field name to mark it as such.
      set(template, [`${pathToField}${FILEPATH_MARKER}`], relpath);
      unset(template, pathToField);
    }
  }

  // Finally, prepare the workflow data to be written into a workflow json file.
  return set(bundle, [WORKFLOW_JSON], toWorkflowJson(mutWorkflow));
};

/*
 * The main write function that takes the fetched workflow data from Knock API
 * (remote workflow), and reads the same workflow from the local file system
 * (local workflow, if available), then writes the remote workflow into a
 * workflow directory with the local workflow as a reference.
 */
export const writeWorkflowDirFromData = async (
  workflowDirCtx: WorkflowDirContext,
  remoteWorkflow: WorkflowData<WithAnnotation>,
): Promise<void> => {
  // If the workflow directory exists on the file system (i.e. previously
  // pulled before), then read the workflow file to use as a reference.
  // Note, we do not need to compile or validate template files for this.
  const [localWorkflow] = workflowDirCtx.exists
    ? await readWorkflowDir(workflowDirCtx, { withTemplateFiles: false })
    : [];

  const bundle = buildWorkflowDirBundle(
    workflowDirCtx,
    remoteWorkflow,
    localWorkflow,
  );

  return writeWorkflowDirFromBundle(workflowDirCtx, bundle);
};

/*
 * A lower level write function that takes a constructed workflow dir bundle
 * and writes it into a workflow directory on a local file system.
 *
 * It does not make any assumptions about how the workflow directory bundle was
 * built; for example, it can be from parsing the workflow data fetched from
 * the Knock API, or built manually for scaffolding purposes.
 */
export const writeWorkflowDirFromBundle = async (
  workflowDirCtx: WorkflowDirContext,
  workflowDirBundle: WorkflowDirBundle,
): Promise<void> => {
  try {
    // TODO(KNO-2794): Should rather clean up any orphaned template files
    // individually after successfully writing the workflow directory.
    await fs.remove(workflowDirCtx.abspath);

    const promises = Object.entries(workflowDirBundle).map(
      ([relpath, fileContent]) => {
        const filePath = path.resolve(workflowDirCtx.abspath, relpath);

        return relpath === WORKFLOW_JSON
          ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
          : fs.outputFile(filePath, fileContent);
      },
    );
    await Promise.all(promises);
  } catch (error) {
    await fs.remove(workflowDirCtx.abspath);
    throw error;
  }
};

/*
 * The bulk write function that takes the fetched workflows data from Knock API
 * (remote workflows), and writes them into a workflows "index" directory by
 * referencing locally available workflows.
 */
export const writeWorkflowsIndexDir = async (
  indexDirCtx: DirContext,
  remoteWorkflows: WorkflowData<WithAnnotation>[],
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    // If the index directory already exists, back it up in the temp sandbox
    // and before wiping it clean.
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await fs.remove(indexDirCtx.abspath);
    }

    // Write given remote workflows into the given workflows directory path.
    const writeWorkflowDirPromises = remoteWorkflows.map(async (workflow) => {
      const workflowDirPath = path.resolve(indexDirCtx.abspath, workflow.key);

      const workflowDirCtx: WorkflowDirContext = {
        type: "workflow",
        key: workflow.key,
        abspath: workflowDirPath,
        exists: indexDirCtx.exists
          ? await isWorkflowDir(workflowDirPath)
          : false,
      };

      return writeWorkflowDirFromData(workflowDirCtx, workflow);
    });

    await Promise.all(writeWorkflowDirPromises);
  } catch (error) {
    // In case of any error, wipe the index directory that is likely in a bad
    // state then restore the backup if one existed before.
    await fs.remove(indexDirCtx.abspath);
    if (indexDirCtx.exists) {
      await fs.copy(backupDirPath, indexDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

// Exported for tests.
export { buildWorkflowDirBundle, toWorkflowJson };
