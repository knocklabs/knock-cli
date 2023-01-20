import { CliUx } from "@oclif/core";

type ResourceType = "workflow" | "layout";

type ResourceDirContextBase = {
  type: ResourceType;
  key: string;
  abspath: string;
  exists: boolean;
};

export type WorkflowDirContext = ResourceDirContextBase & {
  type: "workflow";
};

type LayoutDirContext = ResourceDirContextBase & {
  type: "layout";
};

export type ResourceDirContext = WorkflowDirContext | LayoutDirContext;

export type ResourceTarget = {
  commandId: string;
  type: ResourceType;
  key?: string;
};

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
  switch (target.commandId) {
    case "workflow:pull":
      break;

    default:
      throw new Error(`Unhandled commandId: ${target.commandId}`);
  }

  // If the target resource is a different type than the current resource dir
  // type, error out.
  if (resourceDirCtx.type !== target.type) {
    return CliUx.ux.error(
      `Cannot run ${target.commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  // If the resource key was not procided with the command, then infer from the
  // current resource directory context.
  if (!target.key) {
    return resourceDirCtx;
  }

  // If the resource key was provided and matches the current workflow dir
  // context, then use the current resource directory context; otherwise, error.
  if (target.key === resourceDirCtx.key) {
    return resourceDirCtx;
  }

  return CliUx.ux.error(
    `Cannot run ${target.commandId} \`${target.key}\` inside another ${resourceDirCtx.type} directory:\n${resourceDirCtx.key}`,
  );
};
