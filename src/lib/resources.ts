import type { ResourceType } from "./run-context";

// TODO Remove this once hidden option is removed from message types / guides
export type NonHiddenResourceType = Exclude<ResourceType, "reusable_step">;

/**
 * An ordered array of all resource types.
 *
 * Order is important here, specifically when pushing all resources. For
 * example, if an email layout references a partial, that partial must be pushed
 * first or else the validation and upsert of the layout will fail.
 */
export const ALL_RESOURCE_TYPES: NonHiddenResourceType[] = [
  // Partials first, as email layouts and workflows may reference them
  "partial",
  // Email layouts next, as workflows with email channel steps may reference them
  "email_layout",
  "workflow",
  // Message types then guides, as guides use message types.
  "message_type",
  "guide",
  "translation",
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
  message_type: "message-types",
  guide: "guides",
} as const;
