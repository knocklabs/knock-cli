/*
 * Core context container, based on the location of the command invoked.
 */

export type RunContext = {
  cwd: string;
  resourceDir?: ResourceDirContext;
};

export type T = RunContext;


/*
 * Individual resource context
 */

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
