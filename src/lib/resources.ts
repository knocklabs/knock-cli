import type { ResourceType } from "./run-context";

export type NonHiddenResourceType = Exclude<ResourceType, "message_type">;

export const ALL_NON_HIDDEN_RESOURCE_TYPES: NonHiddenResourceType[] = [
  "email_layout",
  "partial",
  "translation",
  "workflow",
];

/**
 * Default names for resource-specific directories used when pushing or pulling
 * all resources to/from an environment.
 */
export const RESOURCE_SUBDIRS: Record<NonHiddenResourceType, string> = {
  email_layout: "layouts",
  partial: "partials",
  translation: "translations",
  workflow: "workflows",
} as const;
