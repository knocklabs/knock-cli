import { DirContext } from "@/lib/helpers/fs";

/*
 * Core run context object, based on the location of the command invoked.
 */

export type RunContext = {
  cwd: string;
  commandId: string | undefined;
  resourceDir?: ResourceDirContext;
};

export type T = RunContext;

/*
 * Resource directory context
 */

export type ResourceType = "workflow" | "layout" | "translation";

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

export type TranslationDirContext = ResourceDirContextBase & {
  type: "translation";
};

export type ResourceDirContext =
  | WorkflowDirContext
  | LayoutDirContext
  | TranslationDirContext;

export type ResourceTarget = {
  commandId: string;
  type: ResourceType;
  key?: string;
};
