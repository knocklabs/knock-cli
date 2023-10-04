/*
 * Module for surveying the cwd location of the command run and its parent dirs
 * to gather context about a knock resource or the project that the command may
 * be referring to.
 */
import * as path from "node:path";

import * as EmailLayout from "@/lib/marshal/email-layout";
import * as Translation from "@/lib/marshal/translation";
import * as Workflow from "@/lib/marshal/workflow";

import { RunContext } from "./types";

const evaluateRecursively = async (
  ctx: RunContext,
  currDir: string,
): Promise<RunContext> => {
  // Check if we are inside a workflow directory, and if so update the context.
  const isWorkflowDir = await Workflow.isWorkflowDir(currDir);
  if (!ctx.resourceDir && isWorkflowDir) {
    ctx.resourceDir = {
      type: "workflow",
      key: path.basename(currDir),
      abspath: currDir,
      exists: true,
    };
  }

  // Check if we are inside a layout directory, and if so update the context.
  const isEmailLayoutDir = await EmailLayout.isEmailLayoutDir(currDir);
  if (!ctx.resourceDir && isEmailLayoutDir) {
    ctx.resourceDir = {
      type: "email_layout",
      key: path.basename(currDir),
      abspath: currDir,
      exists: true,
    };
  }

  // NOTE: Must keep this check as last in the order of directory-type checks
  // since the `isTranslationDir` only checks that the directory name is a
  // valid locale name.
  const isTranslationDir = Translation.isTranslationDir(currDir);
  if (!ctx.resourceDir && isTranslationDir) {
    ctx.resourceDir = {
      type: "translation",
      key: path.basename(currDir),
      abspath: currDir,
      exists: true,
    };
  }

  // If we've identified the resource context, no need to go further.
  // TODO: In the future, consider supporting a knock project config file which
  // we can use to (semi-)explicitly figure out the project directory structure.
  if (ctx.resourceDir) return ctx;

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
  const ctx = { commandId, cwd: process.cwd() };

  return evaluateRecursively(ctx, ctx.cwd);
};
