/*
 * IMPORTANT:
 *
 * This file is suffixed with `.isomorphic` because the code in this file is
 * meant to run not just in a nodejs environment but also in a browser. For this
 * reason there are some restrictions for which nodejs imports are allowed in
 * this module. See `.eslintrc.json` for more details.
 */
import { AnyObj } from "@/lib/helpers/object.isomorphic";
import { buildStepResourceDirBundle } from "@/lib/marshal/shared/steps.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import { WorkflowData } from "./types";

export { formatExtractedFilePath } from "@/lib/marshal/shared/steps.isomorphic";

export const WORKFLOW_JSON = "workflow.json";
export const VISUAL_BLOCKS_JSON = "visual_blocks.json";

export type WorkflowDirBundle = {
  [relpath: string]: string;
};

/*
 * For a given workflow payload (and its local workflow reference), this function
 * builds a "workflow directory bundle", which is an obj made up of all the
 * relative file paths (within the workflow directory) and its file content to
 * write the workflow directory.
 *
 * Every workflow will always have a workflow.json file, so every bundle includes
 * it and its content at minimum. To the extent the workflow includes any
 * extractable fields, those fields content get extracted out and added to the
 * bundle.
 */
export const buildWorkflowDirBundle = (
  remoteWorkflow: WorkflowData<WithAnnotation>,
  localWorkflow?: AnyObj,
  $schema?: string,
): WorkflowDirBundle =>
  buildStepResourceDirBundle(
    remoteWorkflow,
    localWorkflow,
    WORKFLOW_JSON,
    $schema,
  );
