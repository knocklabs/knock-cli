import {
  FetchingJSONSchemaStore,
  InputData,
  JSONSchemaInput,
  quicktype,
  SerializedRenderResult,
} from "quicktype-core";

import { WorkflowData } from "./marshal/workflow";

type SupportedTypeLanguage = "typescript" | "python" | "go" | "ruby";

function getLanguageFromExtension(
  extension: string,
): SupportedTypeLanguage | undefined {
  switch (extension) {
    case "ts":
      return "typescript";
    case "py":
      return "python";
    case "go":
      return "go";
    case "rb":
      return "ruby";
    default:
      return undefined;
  }
}

/**
 * Given a set of workflows, will go through and generated types for each workflow.
 *
 * If the workflow has no trigger data JSON schema, will return empty lines.
 *
 * @param workflows List of workflows to generate types for
 * @param targetLanguage Target programming language for type generation
 * @returns Generated type definitions for the workflows
 */
async function generateWorkflowTypes(
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

    const schema = {
      ...workflow.trigger_data_json_schema,
      title: `${pascalCaseWorkflowKey}Data`,
    };

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
    rendererOptions: {
      "just-types": true,
    },
  });

  return { result, workflows: validWorkflows };
}

export { generateWorkflowTypes, getLanguageFromExtension };
