import { DirContext } from "@/lib/helpers/fs";

/*
 * Core run context object, based on the location of the command invoked.
 */

export type RunContext = {
  cwd: string;
  commandId: string | undefined;
  resourceDir?: ResourceDirContext;
  branchFilePath?: string;
};

export type T = RunContext;

/*
 * Resource directory context
 */

export type ResourceType =
  | "workflow"
  | "email_layout"
  | "translation"
  | "partial"
  | "message_type"
  | "guide"
  | "reusable_step";

type ResourceDirContextBase = DirContext & {
  type: ResourceType;
  key: string;
};

export type WorkflowDirContext = ResourceDirContextBase & {
  type: "workflow";
};

export type EmailLayoutDirContext = ResourceDirContextBase & {
  type: "email_layout";
};

export type TranslationDirContext = ResourceDirContextBase & {
  type: "translation";
};

export type PartialDirContext = ResourceDirContextBase & {
  type: "partial";
};

export type MessageTypeDirContext = ResourceDirContextBase & {
  type: "message_type";
};

export type GuideDirContext = ResourceDirContextBase & {
  type: "guide";
};

export type ReusableStepDirContext = ResourceDirContextBase & {
  type: "reusable_step";
};

export type ResourceDirContext =
  | WorkflowDirContext
  | EmailLayoutDirContext
  | TranslationDirContext
  | PartialDirContext
  | MessageTypeDirContext
  | GuideDirContext
  | ReusableStepDirContext;

export type ResourceTarget = {
  commandId: string;
  type: ResourceType;
  key?: string;
};
