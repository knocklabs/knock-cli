import { AnyObj } from "@/lib/helpers/object.isomorphic";
import type { Conditions } from "@/lib/marshal/conditions";
import {
  Duration,
  KeyValueBlock,
  MaybeWithAnnotation,
} from "@/lib/marshal/shared/types";

export type ChannelType = "chat" | "email" | "in_app_feed" | "push" | "sms";

export enum StepType {
  Channel = "channel",
  Batch = "batch",
  Delay = "delay",
  HttpFetch = "http_fetch",
  Branch = "branch",
  Throttle = "throttle",
}

type WorkflowStepBase = {
  type: StepType;
  ref: string;
  name?: string;
  description?: string;
  conditions?: Conditions;
};

/* Channel step */

type TemplateSettings<A extends MaybeWithAnnotation> = A & AnyObj;

type TemplateData<A extends MaybeWithAnnotation = unknown> = A &
  AnyObj & {
    settings?: TemplateSettings<A>;
  };

export type ChannelStepData<A extends MaybeWithAnnotation = unknown> =
  WorkflowStepBase & {
    type: StepType.Channel;
    channel_key?: string;
    channel_group_key?: string;
    template: TemplateData<A>;
  };

/* Batch step */

type BatchStepSettings = {
  batch_key?: string;
  batch_until_field_path?: string;
  batch_window?: Duration;
  batch_window_type: "fixed" | "sliding";
  batch_order: "asc" | "desc";
  batch_window_extension_limit?: Duration;
};

type BatchStepData = WorkflowStepBase & {
  type: StepType.Batch;
  settings: BatchStepSettings;
};

/* Throttle step */

type ThrottleStepSettings = {
  throttle_window?: Duration;
  throttle_window_field_path?: string;
  throttle_key?: string;
  throttle_limit: number;
};

type ThrottleStepData = WorkflowStepBase & {
  type: StepType.Throttle;
  settings: ThrottleStepSettings;
};

/* Delay step */

type DelayStepSettings = {
  delay_until_field_path?: string;
  delay_for?: Duration;
};

type DelayStepData = WorkflowStepBase & {
  type: StepType.Delay;
  settings: DelayStepSettings;
};

/* Http fetch step */

type HttpFetchStepSettings = {
  method: string;
  url: string;
  body?: string;
  headers?: KeyValueBlock[];
  query_params?: KeyValueBlock[];
  response_path?: string;
  signing_key?: string;
};

export type HttpFetchStepData = WorkflowStepBase & {
  type: StepType.HttpFetch;
  settings: HttpFetchStepSettings;
};

/* Branch step */

type WorkflowBranch<A extends MaybeWithAnnotation = unknown> = {
  name: string;
  terminates: boolean;
  conditions?: Conditions;
  steps: WorkflowStepData<A>[];
};

type BranchStepData<A extends MaybeWithAnnotation = unknown> = Omit<
  WorkflowStepBase,
  "conditions"
> & {
  type: StepType.Branch;
  branches: WorkflowBranch<A>[];
};

/* Workflow & Union steps */

export type WorkflowStepData<A extends MaybeWithAnnotation = unknown> =
  | ChannelStepData<A>
  | BatchStepData
  | DelayStepData
  | HttpFetchStepData
  | BranchStepData<A>
  | ThrottleStepData;

export type WorkflowData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  name: string;
  active: boolean;
  valid: boolean;
  categories?: string[];
  description?: string;
  steps: WorkflowStepData<A>[];
  trigger_data_json_schema?: Record<string, any>;
  created_at: string;
  updated_at: string;
  sha: string;
};

export type WorkflowInput = AnyObj & {
  key: string;
};
