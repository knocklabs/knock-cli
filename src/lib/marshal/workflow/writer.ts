import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { WorkflowDirContext } from "@/lib/run-context";

import {
  WorkflowDirBundle,
  WORKFLOW_JSON,
  buildWorkflowDirBundle,
} from "./processor.isomorphic";
import { isWorkflowDir } from "./helpers";
import { readWorkflowDir } from "./reader";
import { WorkflowData } from "./types";

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
  const [localWorkflow] = workflowDirCtx.exists
    ? await readWorkflowDir(workflowDirCtx, { withExtractedFiles: true })
    : [];

  const bundle = buildWorkflowDirBundle(remoteWorkflow, localWorkflow);

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
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (workflowDirCtx.exists) {
      await fs.copy(workflowDirCtx.abspath, backupDirPath);
      await fs.emptyDir(workflowDirCtx.abspath);
    }

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
    // In case of any error, wipe the target directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (workflowDirCtx.exists) {
      await fs.emptyDir(workflowDirCtx.abspath);
      await fs.copy(backupDirPath, workflowDirCtx.abspath);
    } else {
      await fs.remove(workflowDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

/*
 * Prunes the index directory by removing any files, or directories that aren't
 * workflow dirs found in fetched workflows. We want to preserve any workflow
 * dirs that are going to be updated with remote workflows, so extracted links
 * can be respected.
 */
const pruneWorkflowsIndexDir = async (
  indexDirCtx: DirContext,
  remoteWorkflows: WorkflowData<WithAnnotation>[],
): Promise<void> => {
  const workflowsByKey = Object.fromEntries(
    remoteWorkflows.map((w) => [w.key.toLowerCase(), w]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });

  const promises = dirents.map(async (dirent) => {
    const direntName = dirent.name.toLowerCase();
    const direntPath = path.resolve(indexDirCtx.abspath, direntName);

    if ((await isWorkflowDir(direntPath)) && workflowsByKey[direntName]) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
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
    // before wiping it clean.
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await pruneWorkflowsIndexDir(indexDirCtx, remoteWorkflows);
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
    if (indexDirCtx.exists) {
      await fs.emptyDir(indexDirCtx.abspath);
      await fs.copy(backupDirPath, indexDirCtx.abspath);
    } else {
      await fs.remove(indexDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

// Exported for tests.
export { pruneWorkflowsIndexDir };
