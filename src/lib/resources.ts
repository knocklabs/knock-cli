import type { ResourceType } from "./run-context";

// TODO Remove this once hidden option is removed from message types
export type NonHiddenResourceType = Exclude<ResourceType, "message_type">;

export const ALL_RESOURCE_TYPES: NonHiddenResourceType[] = [
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
