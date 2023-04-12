import { AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { GFlags } from "@/lib/api-v1";
import { Props } from "@/lib/base-command";
import { PageInfo } from "@/lib/helpers/page";
import { TranslationData } from "@/lib/marshal/translation";
import {
  ChannelStepData,
  ChannelType,
  StepType,
  WorkflowData,
} from "@/lib/marshal/workflow";

import { sequence } from "./helpers";

export const gFlags = (attrs: Partial<GFlags> = {}): GFlags => {
  return {
    "service-token": "valid-token",
    "api-origin": undefined,
    json: undefined,
    ...attrs,
  };
};

export const props = (attrs: Partial<Props> = {}): Props => {
  return {
    flags: gFlags(),
    args: {},
    argv: [],
    raw: [],
    metadata: { flags: {} },
    ...attrs,
  };
};

export const resp = (attrs: Partial<AxiosResponse> = {}): AxiosResponse => {
  return {
    data: undefined,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
    ...attrs,
  };
};

export const pageInfo = (attrs: Partial<PageInfo> = {}): PageInfo => {
  return {
    after: null,
    before: null,
    page_size: 50,
    ...attrs,
  };
};

export const workflow = (attrs: Partial<WorkflowData> = {}): WorkflowData => {
  return {
    name: "New comment",
    key: "new-comment",
    active: false,
    valid: false,
    steps: [],
    created_at: "2022-12-31T12:00:00.000000Z",
    updated_at: "2022-12-31T12:00:00.000000Z",
    ...attrs,
  };
};

const defaultTemplate = (type: ChannelType) => {
  switch (type) {
    case "chat":
      return {
        markdown_body: "Hi **{{ recipient.name }}**.",
      };
    case "email":
      return {
        settings: {
          layout_key: "default",
        },
        subject: "New activity",
        html_body: "<p>Hi <strong>{{ recipient.name }}</strong>.</p>",
      };
    case "in_app_feed":
      return {
        markdown_body: "Hi **{{ recipient.name }}**.",
        action_url: "{{ vars.app_url }}",
      };
    case "sms":
      return {
        text_body: "Hi {{ recipient.name }}.",
      };
    case "push":
      return {
        settings: {
          delivery_type: "content",
        },
        title: "New activity",
        text_body: "Hi {{ recipient.name }}.",
      };
    default:
      throw new Error(`Unhandled channel type: ${type}`);
  }
};

export const channelStep = (
  type: ChannelType,
  attrs: Partial<ChannelStepData> = {},
): ChannelStepData => {
  const step = {
    ref: sequence(`${type}_`),
    channel_key: sequence("provider-"),
    template: defaultTemplate(type),
    ...attrs,

    type: "channel" as StepType.Channel,
  };

  return step;
};

export const translation = (
  attrs: Partial<TranslationData> = {},
): TranslationData => {
  return {
    locale_code: "en",
    namespace: "admin",
    content: '{"welcome":"Hello"}',
    created_at: "2022-12-31T12:00:00.000000Z",
    updated_at: "2022-12-31T12:00:00.000000Z",
    ...attrs,
  };
};
