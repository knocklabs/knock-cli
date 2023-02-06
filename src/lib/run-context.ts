/*
 * Module for surveying the cwd location of the command run and its parent dirs
 * to gather context about a knock resource or the project that the command may
 * be refering to.
 */
import * as path from "node:path";

import * as Workflow from "@/lib/marshal/workflow";

import { ResourceDirContext } from "./helpers/dir-context";

export type RunContext = {
  cwd: string;
  resourceDir?: ResourceDirContext;
};

export type T = RunContext;

const evaluateRecursively = async (
  ctx: RunContext,
  currDir: string,
): Promise<RunContext> => {
  // If we reached the root of the filesystem, nothing more to do.
  const { root } = path.parse(currDir);
  if (currDir === root) return ctx;

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

  // If we've identified the resource context, no need to go further.
  // TODO: In the future also check for knock project dir context.
  if (ctx.resourceDir) return ctx;

  const parentDir = path.resolve(currDir, "..");
  return evaluateRecursively(ctx, parentDir);
};

/*
 * Initialize the run context with the cwd location of where the cli command
 * was invoked, then recursively walk up the dir tree as we gather any resource
 * or project context for the command.
 */
export const load = async (): Promise<RunContext> => {
  const ctx = { cwd: process.cwd() };

  return evaluateRecursively(ctx, ctx.cwd);
};
