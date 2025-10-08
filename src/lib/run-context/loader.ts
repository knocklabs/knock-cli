/*
 * Module for surveying the cwd location of the command run and its parent dirs
 * to gather context about a knock resource or the project that the command may
 * be referring to.
 */
import * as path from "node:path";

import * as EmailLayout from "@/lib/marshal/email-layout";
import * as MessageType from "@/lib/marshal/message-type";
import * as Partial from "@/lib/marshal/partial";
import * as Translation from "@/lib/marshal/translation";
import * as Workflow from "@/lib/marshal/workflow";

import { BRANCH_FILE_NAME, hasCurrentBranchFile } from "../helpers/branch";
import { ResourceType, RunContext } from "./types";

const buildResourceDirContext = (type: ResourceType, currDir: string) => {
  return {
    type,
    key: path.basename(currDir),
    abspath: currDir,
    exists: true,
  };
};

const evaluateRecursively = async (
  ctx: RunContext,
  currDir: string,
): Promise<RunContext> => {
  // Check if we are inside a resource directory and if so update the context.
  if (!ctx.resourceDir) {
    const isWorkflowDir = await Workflow.isWorkflowDir(currDir);
    if (isWorkflowDir) {
      ctx.resourceDir = buildResourceDirContext("workflow", currDir);
    }

    const isEmailLayoutDir = await EmailLayout.isEmailLayoutDir(currDir);
    if (isEmailLayoutDir) {
      ctx.resourceDir = buildResourceDirContext("email_layout", currDir);
    }

    const isPartialDir = await Partial.isPartialDir(currDir);
    if (isPartialDir) {
      ctx.resourceDir = buildResourceDirContext("partial", currDir);
    }

    const isMessageTypeDir = await MessageType.isMessageTypeDir(currDir);
    if (isMessageTypeDir) {
      ctx.resourceDir = buildResourceDirContext("message_type", currDir);
    }

    // NOTE: Must keep this check as last in the order of directory-type checks
    // since the `isTranslationDir` only checks that the directory name is a
    // valid locale name.
    const isTranslationDir = Translation.isTranslationDir(currDir);
    if (isTranslationDir) {
      ctx.resourceDir = buildResourceDirContext("translation", currDir);
    }
  }

  if (!ctx.branchFilePath) {
    const currentBranchFileExists = await hasCurrentBranchFile(currDir);
    if (currentBranchFileExists) {
      ctx.branchFilePath = path.resolve(currDir, BRANCH_FILE_NAME);
    }
  }

  // If we've identified the resource context and the branch file, no need to go further.
  // TODO: In the future, consider supporting a knock project config file which
  // we can use to (semi-)explicitly figure out the project directory structure.
  if (ctx.resourceDir && ctx.branchFilePath) return ctx;

  // If we reached the root of the filesystem, nothing more to do.
  const { root } = path.parse(currDir);
  if (currDir === root) return ctx;

  const parentDir = path.resolve(currDir, "..");
  return evaluateRecursively(ctx, parentDir);
};

/*
 * Initialize the run context with the cwd location of where the cli command
 * was invoked, then recursively walk up the dir tree as we gather any resource
 * or project context for the command.
 */
export const load = async (
  commandId?: string | undefined,
): Promise<RunContext> => {
  const ctx: RunContext = { commandId, cwd: process.cwd() };

  return evaluateRecursively(ctx, ctx.cwd);
};
