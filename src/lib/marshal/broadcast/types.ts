import { AnyObj } from "@/lib/helpers/object.isomorphic";
import type { MaybeWithAnnotation } from "@/lib/marshal/shared/types";

import { StepType, type WorkflowStepData } from "../workflow/types";

export type BroadcastStatus = "draft" | "scheduled" | "sent";

export type BroadcastSettings = {
  is_commercial?: boolean;
  override_preferences?: boolean;
};

// Management API broadcasts only support channel, branch, and delay steps.
// Nested branch steps stay `WorkflowStepData` until that type is generic.
export type BroadcastStepData<A extends MaybeWithAnnotation = unknown> =
  Extract<
    WorkflowStepData<A>,
    { type: StepType.Channel | StepType.Branch | StepType.Delay }
  >;

export type BroadcastData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  name: string;
  valid: boolean;
  status: BroadcastStatus;
  description?: string;
  categories?: string[];
  target_audience_key?: string;
  scheduled_at?: string | null;
  sent_at?: string | null;
  settings?: BroadcastSettings;
  steps: BroadcastStepData<A>[];
  created_at: string;
  updated_at: string;
  environment: string;
  sha: string;
};

export type BroadcastInput = AnyObj & {
  key: string;
};
