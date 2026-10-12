import type { ResourceType } from "./run-context";

// TODO Remove this once hidden option is removed from message types / guides
export type NonHiddenResourceType = Exclude<ResourceType, "reusable_step">;

/**
 * Resource types that support empty commits via --allow-empty.
 * Excludes audience until @knocklabs/mgmt ships allow_empty on upsert params.
 * Excludes goal because goals auto-publish and are not committed.
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
 * CLI capabilities per resource type. Used by bulk `knock pull` / `knock push`
 * to build per-resource argv without ad-hoc string filters.
 */
export type ResourceCliCapabilities = {
  supportsBranch: boolean;
  supportsHideUncommitted: boolean;
  supportsCommit: boolean;
  supportsAllowEmpty: boolean;
  supportsForceOnPush: boolean;
};

export const RESOURCE_CLI_CAPABILITIES: Record<
  NonHiddenResourceType,
  ResourceCliCapabilities
> = {
  audience: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: false,
    supportsForceOnPush: true,
  },
  partial: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
  },
  email_layout: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
  },
  goal: {
    supportsBranch: false,
    supportsHideUncommitted: false,
    supportsCommit: false,
    supportsAllowEmpty: false,
    supportsForceOnPush: false,
  },
  workflow: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
  },
  message_type: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
  },
  guide: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
  },
  translation: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
  },
};

export type BulkPullFlags = {
  environment?: string;
  branch?: string;
  "hide-uncommitted-changes"?: boolean;
  "service-token"?: string;
  "api-origin"?: string;
};

export type BulkPushFlags = {
  environment?: string;
  branch?: string;
  "service-token"?: string;
  "api-origin"?: string;
  commit?: boolean;
  "commit-message"?: string;
  "allow-empty"?: boolean;
  force?: boolean;
};

export const buildBulkPullArgs = (
  resourceType: NonHiddenResourceType,
  flags: BulkPullFlags,
): string[] => {
  const caps = RESOURCE_CLI_CAPABILITIES[resourceType];

  return [
    "--all",
    "--force",
    ...(flags.environment ? ["--environment", flags.environment] : []),
    ...(caps.supportsBranch && flags.branch ? ["--branch", flags.branch] : []),
    ...(caps.supportsHideUncommitted && flags["hide-uncommitted-changes"]
      ? ["--hide-uncommitted-changes"]
      : []),
    ...(flags["service-token"]
      ? ["--service-token", flags["service-token"]]
      : []),
    ...(flags["api-origin"] ? ["--api-origin", flags["api-origin"]] : []),
  ];
};

export const buildBulkPushArgs = (
  resourceType: NonHiddenResourceType,
  flags: BulkPushFlags,
): string[] => {
  const caps = RESOURCE_CLI_CAPABILITIES[resourceType];

  return [
    "--all",
    ...(flags.environment ? ["--environment", flags.environment] : []),
    ...(caps.supportsBranch && flags.branch ? ["--branch", flags.branch] : []),
    ...(flags["service-token"]
      ? ["--service-token", flags["service-token"]]
      : []),
    ...(flags["api-origin"] ? ["--api-origin", flags["api-origin"]] : []),
    ...(caps.supportsCommit && flags.commit ? ["--commit"] : []),
    ...(caps.supportsCommit && flags["commit-message"]
      ? ["--commit-message", flags["commit-message"]]
      : []),
    ...(caps.supportsAllowEmpty && flags["allow-empty"]
      ? ["--allow-empty"]
      : []),
    ...(caps.supportsForceOnPush && flags.force ? ["--force"] : []),
  ];
};

/**
 * An ordered array of all resource types.
 *
 * Order is important here, specifically when pushing all resources. For
 * example, if an email layout references a partial, that partial must be pushed
 * first or else the validation and upsert of the layout will fail.
 */
export const ALL_RESOURCE_TYPES: NonHiddenResourceType[] = [
  // Audiences can be referenced by workflows, so push them early
  "audience",
  // Partials first, as email layouts and workflows may reference them
  "partial",
  // Email layouts next, as workflows with email channel steps may reference them
  "email_layout",
  // Goals before workflows/guides that may attach them
  "goal",
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
  audience: "audiences",
  email_layout: "layouts",
  partial: "partials",
  translation: "translations",
  workflow: "workflows",
  message_type: "message-types",
  guide: "guides",
  goal: "goals",
} as const;

/**
 * Flag name for the resource-specific directory on pull/push --all commands.
 */
export const RESOURCE_DIR_FLAGS: Record<NonHiddenResourceType, string> = {
  audience: "--audiences-dir",
  email_layout: "--layouts-dir",
  partial: "--partials-dir",
  translation: "--translations-dir",
  workflow: "--workflows-dir",
  message_type: "--message-types-dir",
  guide: "--guides-dir",
  goal: "--goals-dir",
} as const;
