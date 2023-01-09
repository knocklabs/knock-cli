import { AxiosResponse } from "axios";
import { get, set } from "lodash";

import { GFlags } from "@/lib/api-v1";
import { Props } from "@/lib/base-command";
import { PageInfo } from "@/lib/helpers/page";
import {
  ChannelStepData,
  ChannelType,
  StepType,
  TemplateVariantByRef,
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
    config: {},
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

const templateDefaultVariant = (type: ChannelType) => {
  switch (type) {
    case "chat":
      return {
        name: "Default",
        markdown_body: "Hi **{{ recipient.name }}**.",
      };
    case "email":
      return {
        name: "Default",
        subject: "New activity",
        html_body: "<p>Hi <strong>{{ recipient.name }}</strong>.</p>",
        layout_key: "default",
      };
    case "in_app_feed":
      return {
        name: "Default",
        markdown_body: "Hi **{{ recipient.name }}**.",
        action_url: "{{ vars.app_url }}",
      };
    case "sms":
      return {
        name: "Default",
        text_body: "Hi {{ recipient.name }}.",
      };
    case "push":
      return {
        name: "Default",
        delivery_type: "content",
        title: "New activity",
        text_body: "Hi {{ recipient.name }}.",
      };
    default:
      throw new Error(`Unhandled channel type: ${type}`);
  }
};

const templateVariantPath = (variantRef: string): string =>
  `template.${variantRef}`;

export const channelStep = (
  type: ChannelType,
  attrs: Partial<ChannelStepData> = {},
  templateVariantsByRef: TemplateVariantByRef = {},
): ChannelStepData => {
  const step = {
    ref: sequence(`${type}_`),
    channel_key: sequence("provider-"),
    template: {},
    ...attrs,

    type: "channel" as StepType.Channel,
  };

  for (const [variantRef, templateVariant] of Object.entries(
    templateVariantsByRef,
  )) {
    set(step, templateVariantPath(variantRef), templateVariant);
  }

  if (!get(step, templateVariantPath("default"))) {
    set(step, templateVariantPath("default"), templateDefaultVariant(type));
  }

  return step;
};
