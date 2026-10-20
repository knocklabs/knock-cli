import type { CommitListParams } from "@knocklabs/mgmt/resources/commits";

import type { ResourceType } from "./run-context";

type CommitResourceType = Extract<
  NonNullable<CommitListParams["resource_type"]>,
  string
>;

// TODO Remove this once hidden option is removed from message types / guides.
export type NonHiddenResourceType = Exclude<ResourceType, "reusable_step">;

/**
 * Resource types included in bulk `knock pull` / `knock push`.
 * Broadcasts have their own commands and are not part of that bulk flow.
 * Commit resource types are derived from this list, so broadcasts stay out.
 */
export type BulkResourceType = Exclude<NonHiddenResourceType, "broadcast">;

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
  /**
   * When true, bulk `knock pull` / `knock push` may warn and continue if this
   * resource fails with a soft-failable gate/scope error (see
   * `isSoftFailableBulkError`). Validation and other failures still abort.
   */
  softFailOnBulk: boolean;
};

export const RESOURCE_CLI_CAPABILITIES: Record<
  BulkResourceType,
  ResourceCliCapabilities
> = {
  audience: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: false,
    supportsForceOnPush: true,
    softFailOnBulk: false,
  },
  partial: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
    softFailOnBulk: false,
  },
  email_layout: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
    softFailOnBulk: false,
  },
  reusable_request: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
    softFailOnBulk: false,
  },
  goal: {
    supportsBranch: false,
    supportsHideUncommitted: false,
    supportsCommit: false,
    supportsAllowEmpty: false,
    supportsForceOnPush: false,
    softFailOnBulk: true,
  },
  workflow: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
    softFailOnBulk: false,
  },
  message_type: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
    softFailOnBulk: false,
  },
  guide: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
    softFailOnBulk: false,
  },
  translation: {
    supportsBranch: true,
    supportsHideUncommitted: true,
    supportsCommit: true,
    supportsAllowEmpty: true,
    supportsForceOnPush: true,
    softFailOnBulk: false,
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
  resourceType: BulkResourceType,
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
  resourceType: BulkResourceType,
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
export const ALL_RESOURCE_TYPES: BulkResourceType[] = [
  // Audiences can be referenced by workflows, so push them early
  "audience",
  // Partials first, as email layouts and workflows may reference them
  "partial",
  // Email layouts next, as workflows with email channel steps may reference them
  "email_layout",
  // Workflows can link to reusable requests, so push those first.
  "reusable_request",
  // Goals before workflows/guides that may attach them
  "goal",
  "workflow",
  // Message types then guides, as guides use message types.
  "message_type",
  "guide",
  "translation",
];

/**
 * Resource types that participate in the commit API. Goals auto-publish and
 * are not committed, so they are excluded from commit CLI `--resource-type`.
 */
export const COMMITTABLE_RESOURCE_TYPES: CommitResourceType[] =
  ALL_RESOURCE_TYPES.filter(
    (resourceType): resourceType is CommitResourceType =>
      RESOURCE_CLI_CAPABILITIES[resourceType].supportsCommit,
  );

/**
 * Default names for resource-specific directories used when pushing or pulling
 * all resources to/from an environment.
 */
export const RESOURCE_SUBDIRS: Record<BulkResourceType, string> = {
  audience: "audiences",
  email_layout: "layouts",
  partial: "partials",
  reusable_request: "reusable-requests",
  translation: "translations",
  workflow: "workflows",
  message_type: "message-types",
  guide: "guides",
  goal: "goals",
} as const;

/**
 * Flag name for the resource-specific directory on pull/push --all commands.
 */
export const RESOURCE_DIR_FLAGS: Record<BulkResourceType, string> = {
  audience: "--audiences-dir",
  email_layout: "--layouts-dir",
  partial: "--partials-dir",
  reusable_request: "--reusable-requests-dir",
  translation: "--translations-dir",
  workflow: "--workflows-dir",
  message_type: "--message-types-dir",
  guide: "--guides-dir",
  goal: "--goals-dir",
} as const;
