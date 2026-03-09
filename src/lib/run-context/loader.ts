/*
 * Module for surveying the cwd location of the command run and its parent dirs
 * to gather context about a knock resource or the project that the command may
 * be referring to.
 */
import * as path from "node:path";

import * as Audience from "@/lib/marshal/audience";
import * as EmailLayout from "@/lib/marshal/email-layout";
import * as Guide from "@/lib/marshal/guide";
import * as MessageType from "@/lib/marshal/message-type";
import * as Partial from "@/lib/marshal/partial";
import * as Translation from "@/lib/marshal/translation";
import * as Workflow from "@/lib/marshal/workflow";

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
    if (await Audience.isAudienceDir(currDir)) {
      ctx.resourceDir = buildResourceDirContext("audience", currDir);
    } else if (await Workflow.isWorkflowDir(currDir)) {
      ctx.resourceDir = buildResourceDirContext("workflow", currDir);
    } else if (await Guide.isGuideDir(currDir)) {
      ctx.resourceDir = buildResourceDirContext("guide", currDir);
    } else if (await EmailLayout.isEmailLayoutDir(currDir)) {
      ctx.resourceDir = buildResourceDirContext("email_layout", currDir);
    } else if (await Partial.isPartialDir(currDir)) {
      ctx.resourceDir = buildResourceDirContext("partial", currDir);
    } else if (await MessageType.isMessageTypeDir(currDir)) {
      ctx.resourceDir = buildResourceDirContext("message_type", currDir);
    } else if (Translation.isTranslationDir(currDir)) {
      // NOTE: Must keep this check as last in the order of directory-type checks
      // since the `isTranslationDir` only checks that the directory name is a
      // valid locale name.
      ctx.resourceDir = buildResourceDirContext("translation", currDir);
    }
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
