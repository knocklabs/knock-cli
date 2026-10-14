import type { ResourceType } from "./run-context";

// TODO Remove this once hidden option is removed from message types / guides
export type NonHiddenResourceType = Exclude<ResourceType, "reusable_step">;

/**
 * Resource types that support empty commits via --allow-empty.
 * Excludes audience until @knocklabs/mgmt ships allow_empty on upsert params.
 */
export const ALLOW_EMPTY_RESOURCE_TYPES = [
  "partial",
  "email_layout",
  "workflow",
  "message_type",
  "guide",
  "translation",
] as const satisfies readonly NonHiddenResourceType[];

export type AllowEmptyResourceType =
  (typeof ALLOW_EMPTY_RESOURCE_TYPES)[number];

/**
 * Ordered resource types included in bulk `knock pull` / `knock push`.
 * Goals are intentionally omitted until bulk sync is wired up.
 *
 * Order matters when pushing: e.g. email layouts that reference partials need
 * those partials pushed first.
 */
export const ALL_RESOURCE_TYPES = [
  // Audiences can be referenced by workflows, so push them early
  "audience",
  // Partials first, as email layouts and workflows may reference them
  "partial",
  // Email layouts next, as workflows with email channel steps may reference them
  "email_layout",
  "workflow",
  // Message types then guides, as guides use message types.
  "message_type",
  "guide",
  "translation",
] as const satisfies readonly NonHiddenResourceType[];

export type SyncableResourceType = (typeof ALL_RESOURCE_TYPES)[number];

/**
 * Default names for resource-specific directories used when pushing or pulling
 * all resources to/from an environment.
 */
export const RESOURCE_SUBDIRS: Record<NonHiddenResourceType, string> = {
  audience: "audiences",
  email_layout: "layouts",
  partial: "partials",
  translation: "translations",
  workflow: "workflows",
  message_type: "message-types",
  guide: "guides",
  goal: "goals",
} as const;
