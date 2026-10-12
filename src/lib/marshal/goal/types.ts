import { MaybeWithAnnotation } from "../shared/types";

/**
 * Attaches a goal to a workflow, guide, or broadcast for attribution tracking.
 * Matches @knocklabs/mgmt Shared.GoalAttachment.
 */
export type GoalAttachment = {
  goal_key: string;
  attribution_window_days?: number;
};

export type GoalIntegrationSourceEvent = {
  event_type: "integration_source";
  event_key: string;
  integration_source_key: string;
  recipient_path?: string | null;
};

export type GoalAudienceEvent = {
  event_type: "audience";
  audience_key: string;
  event_key: "enter" | "exit";
};

export type GoalEvent = GoalIntegrationSourceEvent | GoalAudienceEvent;

/**
 * Match conditions use the Management API ConditionGroup shape (all/any or
 * operator/conditions variants). Kept loose so local files round-trip without
 * fighting SDK union details.
 */
export type GoalCondition = {
  event: GoalEvent;
  match_conditions?: unknown[];
};

/**
 * Writable goal payload for upsert / validate.
 */
export type GoalRequest = {
  name: string;
  description?: string | null;
  condition: GoalCondition;
};

/**
 * Goal data from the Management API.
 */
export type GoalData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  name: string;
  description?: string | null;
  condition: GoalCondition;
  environment: string;
  created_at: string;
  updated_at: string;
  sha: string;
};
