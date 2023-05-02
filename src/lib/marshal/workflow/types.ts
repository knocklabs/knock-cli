import { AnyObj } from "@/lib/helpers/object";
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
  batch_order: "asc" | "desc";
};

type BatchStepData = WorkflowStepBase & {
  type: StepType.Batch;
  settings: BatchStepSettings;
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
};

/* Workflow & Union steps */

type HttpFetchStepData = WorkflowStepBase & {
  type: StepType.HttpFetch;
  settings: HttpFetchStepSettings;
};

export type WorkflowStepData<A extends MaybeWithAnnotation = unknown> =
  | ChannelStepData<A>
  | BatchStepData
  | DelayStepData
  | HttpFetchStepData;

export type WorkflowData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  name: string;
  active: boolean;
  valid: boolean;
  categories?: string[];
  description?: string;
  steps: WorkflowStepData<A>[];
  created_at: string;
  updated_at: string;
};

export type WorkflowInput = AnyObj & {
  key: string;
};
