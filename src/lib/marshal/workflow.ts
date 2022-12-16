import { unset } from "lodash";
import * as fs from "fs-extra";

import { split, omitDeep, Obj } from "@/lib/helpers/object-helpers";

// TODO: Get rid of any's and sort out the types.

type TemplateFilesMapping = {
  [k: string]: string;
}

type WorkflowDirMapping = {
  workflow: Obj;
  templateFiles: TemplateFilesMapping;
}

const formatTemplateFilePath = (stepRef: string, templateRef: string, fieldName: string, fileExt: string) =>
  `${stepRef}/${templateRef}.${fieldName}.${fileExt}`

export const parseWorkflowPayload = (payload: Obj): WorkflowDirMapping => {
  let workflow = payload;
  const templateFiles: any = {};

  // Fold any readonly fields under the key "__readonly".
  const readonlyFields = payload["__annotation"]["readonly_fields"] || []
  const [readonly, remainder] = split(payload, readonlyFields);
  workflow = { ...remainder, "__readonly": readonly }

  // Extract out template files
  workflow.steps.forEach((step: any) => {
    if (!step.template) return;

    Object.entries(step.template).forEach(([templateRef, templatePayload]: any) => {
      const extractableFields = templatePayload["__annotation"]["extractable_fields"]

      Object.entries(extractableFields).forEach(([fieldName, extractSettings]: any) => {
        if (!templatePayload[fieldName]) return;
        if (!extractSettings["default"]) return;

        const fileExt = extractSettings["file_ext"];
        const filePath = formatTemplateFilePath(step.ref, templateRef, fieldName, fileExt) as any;

        templateFiles[filePath] = templatePayload[fieldName];
        templatePayload[`${fieldName}@`] = filePath;
        unset(templatePayload, fieldName);
      })
    })
  })

  workflow = omitDeep(workflow, ["__annotation"])

  return { workflow, templateFiles };
}




export const writeWorkflowDir = async (payload: Obj) => {
  const workflowKey = payload.key
  const { workflow, templateFiles } = parseWorkflowPayload(payload);
  // const { workflow, templateFiles } = workflowDirMapping;

  const workflowFilePath = `./${workflowKey}/workflow.json`;

  fs.outputJson(workflowFilePath, workflow, { spaces: "\t" });

  Object.entries(templateFiles).forEach(([templateFilePath, fileContent]) => {
    fs.outputFile(`./${workflowKey}/${templateFilePath}`, fileContent);
  })
}
