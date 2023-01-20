import * as path from "node:path";

import * as fs from "fs-extra";
import { isPlainObject, set } from "lodash";

import { WorkflowDirContext } from "@/lib/helpers/dir-context";
import { formatErrors, JsonError } from "@/lib/helpers/error";
import { readJson, ReadJsonResult } from "@/lib/helpers/json";
import { AnyObj, ObjPath, omitDeep } from "@/lib/helpers/object";

import { FILEPATH_MARKED_RE, lsWorkflowJson } from "./helpers";
import { StepType, WorkflowStepData } from "./types";

/*
 * Validate the file path format of an extracted template field. The file path
 * must be:
 *
 * 1) Expressed as a relative path.
 *
 *    For exmaple:
 *      subject@: "email_1/subject.html"              // GOOD
 *      subject@: "./email_1/subject.html"            // GOOD
 *      subject@: "/workflow-x/email_1/subject.html"  // BAD
 *
 * 2) The resolved path must be contained inside the workflow directory
 *
 *    For exmaple (workflow-y is a different workflow dir in this example):
 *      subject@: "./email_1/subject.html"              // GOOD
 *      subject@: "../workflow-y/email_1/subject.html"  // BAD
 *
 * Note: does not validate the presence of the file nor the uniqueness of the
 * file path.
 */
export const validateTemplateFilePathFormat = (
  relpath: unknown,
  workflowDirCtx: WorkflowDirContext,
): boolean => {
  if (typeof relpath !== "string") return false;
  if (path.isAbsolute(relpath)) return false;

  const abspath = path.resolve(workflowDirCtx.abspath, relpath);
  const pathDiff = path.relative(workflowDirCtx.abspath, abspath);

  return !pathDiff.startsWith("..");
};

/*
 * Validate that a file exists at the given relative path in the directory.
 */
const validateTemplateFileExists = async (
  relpath: string,
  workflowDirCtx: WorkflowDirContext,
): Promise<boolean> => {
  const abspath = path.resolve(workflowDirCtx.abspath, relpath);

  return fs.pathExists(abspath);
};

/*
 * Read a template file at the given path, validate the content as applicable,
 * return the content string or an error.
 */
type TemplateFileContent = string;
type MaybeTemplateFileContent = TemplateFileContent | undefined;
type ReadTemplateFileResult = [MaybeTemplateFileContent, SyntaxError[]];

const readTemplateFile = async (
  relpath: string,
  workflowDirCtx: WorkflowDirContext,
): Promise<ReadTemplateFileResult> => {
  const abspath = path.resolve(workflowDirCtx.abspath, relpath);

  switch (true) {
    case abspath.toLowerCase().endsWith(".json"): {
      const [obj, errors] = await readJson(abspath);
      const content = obj && JSON.stringify(obj);
      return [content, errors];
    }

    default: {
      const content = await fs.readFile(abspath, "utf8");
      return [content, []];
    }
  }
};

/*
 * Given a workflow json object, compiles all referenced template files in it
 * and returns the updated object with templates content pulled in and inlined.
 *
 * In order for us to traverse the workflow object and gather template file
 * references (i.e. file paths to read), the given object must be structurally
 * "valid" to some degree. Given we cannot know that, we do minimum validations
 * necessary to reach templates in channel steps.
 *
 * Note, this function is meant to be a PRIVATE func and MUTATES the object.
 *
 * TODO: Include links to docs in the error message when ready.
 */
type CompileTemplateFilesResult = [AnyObj, JsonError[]];

const compileTemplateFiles = async (
  workflowDirCtx: WorkflowDirContext,
  workflowJson: AnyObj,
): Promise<CompileTemplateFilesResult> => {
  const errors: JsonError[] = [];
  const extractedFilePaths: Record<string, boolean> = {};
  const objPath = new ObjPath();

  // 1. Make sure we have a list of steps to look through.
  if (workflowJson.steps === undefined) {
    errors.push(
      new JsonError(
        "must have a `steps` field containing workflow steps",
        objPath.str,
      ),
    );

    return [workflowJson, errors];
  }

  if (!Array.isArray(workflowJson.steps)) {
    errors.push(
      new JsonError(
        "must be an array of workflow steps",
        objPath.to("steps").str,
      ),
    );

    return [workflowJson, errors];
  }

  // 2. Make sure we can reach `steps[i].template` for channel steps.
  const steps = (workflowJson.steps || []) as Partial<WorkflowStepData>[];
  const pathToSteps = objPath.push("steps").checkout();

  for (const [stepIdx, step] of steps.entries()) {
    objPath.reset(pathToSteps).push(stepIdx);

    if (!isPlainObject(step)) {
      errors.push(
        new JsonError("must be a workflow step object", objPath.str),
      );
      continue;
    }

    if (step.type === undefined) {
      errors.push(new JsonError("must have a `type` field", objPath.str));
      continue;
    }

    // Not a channel step, nothing more to do.
    if (step.type !== StepType.Channel) {
      continue;
    }

    // TODO: Will need to change below once we update the template data object
    // to include template settings and template variants under variants key.

    if (step.template === undefined) {
      errors.push(
        new JsonError(
          "must have a `template` field containing a template object",
          objPath.str,
        ),
      );
      continue;
    }

    if (!isPlainObject(step.template)) {
      errors.push(
        new JsonError("must be a template object", objPath.to("template").str),
      );
      continue;
    }

    // 3. For each template variant, look for any extracted template content,
    // read the extracted template files, then inline the content.
    const variants = Object.entries(step.template);
    const pathToTemplate = objPath.push("template").checkout();

    for (const [templateVariantRef, templateVariant] of variants) {
      objPath.reset(pathToTemplate).push(templateVariantRef);

      if (!isPlainObject(templateVariant)) {
        errors.push(
          new JsonError("must be a template variant object", objPath.str),
        );
        continue;
      }

      // No need to push a new path part, since we aren't going any deeper now.
      for (const [fieldName, val] of Object.entries(templateVariant)) {
        // If the field is not marked as having a file path then, nothing more
        // to do here.
        if (!FILEPATH_MARKED_RE.test(fieldName)) continue;

        const pathToFieldStr = objPath.to(fieldName).str;

        // Validate the file path format, and that it is unique per workflow.
        if (
          !validateTemplateFilePathFormat(val, workflowDirCtx) ||
          typeof val !== "string" ||
          val in extractedFilePaths
        ) {
          errors.push(
            new JsonError(
              "must be a relative path string to a unique file within the directory",
              pathToFieldStr,
            ),
          );
          continue;
        }

        // Keep track of all the extracted file paths that have been seen, so we
        // can validate each file path's uniqueness as we traverse.
        extractedFilePaths[val] = true;

        // Check a file actually exists at the given file path.
        // eslint-disable-next-line no-await-in-loop
        const exists = await validateTemplateFileExists(val, workflowDirCtx);
        if (!exists) {
          errors.push(
            new JsonError(
              "must be a relative path string to a file that exists",
              pathToFieldStr,
            ),
          );
          continue;
        }

        // Read the template file and inline the content into the workflow json
        // under the same field name but without the @ filepath marker.
        // eslint-disable-next-line no-await-in-loop
        const [content, contentErrors] = await readTemplateFile(
          val,
          workflowDirCtx,
        );
        if (contentErrors.length > 0) {
          errors.push(
            new JsonError(
              `points to a file with invalid content (${val})\n\n` +
                formatErrors(contentErrors),
              pathToFieldStr,
            ),
          );
          continue;
        }

        const inlinePathStr = pathToFieldStr.replace(FILEPATH_MARKED_RE, "");
        set(workflowJson, inlinePathStr, content);

        // TODO: Consider validating content for liquid syntax too maybe?
      }
    }
  }

  return [workflowJson, errors];
};

/*
 * The main read function that takes the path to a workflow directory, then
 * reads from the file system. Looks for the workflow json file as an entry
 * point and returns the workflow data obj.
 *
 * By default, it will look for any extracted template files referenced in the
 * workflow json and compile them into the workflow data.
 */
type ReadWorkflowDirOpts = {
  withTemplateFiles?: boolean;
  withReadonlyField?: boolean;
};

export const readWorkflowDir = async (
  workflowDirCtx: WorkflowDirContext,
  opts: ReadWorkflowDirOpts = {},
): Promise<ReadJsonResult | CompileTemplateFilesResult> => {
  const { abspath } = workflowDirCtx;
  const { withTemplateFiles = false, withReadonlyField = false } = opts;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const workflowJsonPath = await lsWorkflowJson(abspath);
  if (!workflowJsonPath)
    throw new Error(`${abspath} is not a workflow directory`);

  const result = await readJson(workflowJsonPath);
  if (!result[0]) return result;

  let [workflowJson] = result;

  workflowJson = withReadonlyField
    ? workflowJson
    : omitDeep(workflowJson, ["__readonly"]);

  return withTemplateFiles
    ? compileTemplateFiles(workflowDirCtx, workflowJson)
    : [workflowJson, []];
};
