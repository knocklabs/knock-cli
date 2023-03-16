import { DirContext } from "@/lib/helpers/fs";

/*
 * Core run context object, based on the location of the command invoked.
 */

export type RunContext = {
  cwd: string;
  resourceDir?: ResourceDirContext;
};

export type T = RunContext;

/*
 * Resource directory context
 */

export type ResourceType = "workflow" | "layout";

type ResourceDirContextBase = DirContext & {
  type: ResourceType;
  key: string;
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
