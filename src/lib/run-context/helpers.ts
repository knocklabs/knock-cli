import { CliUx } from "@oclif/core";

import { ResourceDirContext, ResourceTarget } from "./types";

/*
 * Ensures the given resource directory does not conflict with the target
 * resource in the invoked command.
 *
 * Returns the resource directory context if valid, otherwise error out.
 */
export const ensureResourceDirForTarget = (
  resourceDirCtx: ResourceDirContext,
  target: ResourceTarget,
): ResourceDirContext => {
  // If the target resource is a different type than the current resource dir
  // type, error out.
  if (resourceDirCtx.type !== target.type) {
    return CliUx.ux.error(
      `Cannot run ${target.commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  // If the resource key was not provided with the command, then infer from the
  // current resource directory context.
  if (!target.key) {
    return resourceDirCtx;
  }

  // If the resource key was provided and matches the current workflow/translation dir
  // context, then use the current resource directory context; otherwise, error.
  if (target.key === resourceDirCtx.key) {
    return resourceDirCtx;
  }

  return CliUx.ux.error(
    `Cannot run ${target.commandId} \`${target.key}\` inside another ${resourceDirCtx.type} directory:\n${resourceDirCtx.key}`,
  );
};
