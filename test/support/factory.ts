import { randomUUID } from "node:crypto";

import { AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { BFlags, Props } from "@/lib/base-command";
import { PageInfo } from "@/lib/helpers/page";
import { CommitData } from "@/lib/marshal/commit";
import { EmailLayoutData } from "@/lib/marshal/email-layout";
import { GuideData } from "@/lib/marshal/guide";
import { MessageTypeData } from "@/lib/marshal/message-type";
import { PartialData, PartialType } from "@/lib/marshal/partial";
import { TranslationData } from "@/lib/marshal/translation";
import {
  ChannelStepData,
  ChannelType,
  StepType,
  WorkflowData,
} from "@/lib/marshal/workflow";

import { sequence } from "./helpers";

export const gFlags = (attrs: Partial<BFlags> = {}): BFlags => {
  return {
    "service-token": "valid-token",
    "api-origin": undefined,
    json: undefined,
    ...attrs,
  };
};

export const props = (attrs: Partial<Props> = {}): Props => {
  const { flags = {}, args = {} } = attrs;

  return {
    flags: { ...gFlags(), ...flags },
    args,
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
    content: '{"welcome":"Hello"}',
    created_at: "2022-12-31T12:00:00.000000Z",
    updated_at: "2022-12-31T12:00:00.000000Z",
    format: "json",
    ...attrs,
  };
};

export const emailLayout = (
  attrs: Partial<EmailLayoutData> = {},
): EmailLayoutData => {
  return {
    key: "transactional",
    name: "Transactional",
    html_layout: "<html><body> Content </body></html>",
    text_layout: "Text content",
    footer_links: [{ text: "Link1", url: "https://exampleUrl.com" }],
    environment: "development",
    created_at: "2022-12-31T12:00:00.000000Z",
    updated_at: "2022-12-31T12:00:00.000000Z",
    ...attrs,
  };
};

export const commit = (attrs: Partial<CommitData> = {}): CommitData => {
  return {
    id: randomUUID(),
    resource: { type: "workflow", identifier: "new-comment" },
    author: {
      email: "john.doe@example.com",
      name: "John Doe",
    },
    commit_message: "This is a commit message",
    created_at: "2022-12-31T12:00:00.000000Z",
    environment: "development",
    ...attrs,
  };
};

export const partial = (attrs: Partial<PartialData> = {}): PartialData => {
  return {
    key: "cta",
    valid: false,
    description: "Call to action",
    name: "Call to action",
    visual_block_enabled: false,
    environment: "development",
    icon_name: "bell",
    type: PartialType.Html,
    content: "<div>{{heading}}<button>{{cta}}</button></div>",
    created_at: "2022-12-31T12:00:00.000000Z",
    updated_at: "2022-12-31T12:00:00.000000Z",
    ...attrs,
  };
};

export const messageType = (
  attrs: Partial<MessageTypeData> = {},
): MessageTypeData => {
  return {
    key: "banner",
    valid: true,
    owner: "user",
    description: "My banner",
    name: "Banner",
    icon_name: "Flag",
    semver: null,
    variants: [
      {
        key: "default",
        name: "Default",
        fields: [
          {
            type: "text",
            key: "title",
            label: "Title",
            settings: {
              required: true,
              default: "Banner title",
            },
          },
        ],
      },
    ],
    preview: "<div>{{title}}</div>",
    created_at: "2022-12-31T12:00:00.000000Z",
    updated_at: "2022-12-31T12:00:00.000000Z",
    environment: "development",
    ...attrs,
  };
};

export const guide = (attrs: Partial<GuideData> = {}): GuideData => {
  return {
    key: "welcome-guide",
    valid: true,
    active: true,
    name: "Welcome Guide",
    description: "A guide to help new users get started",
    channel_key: "in-app-guide",
    type: "banner",
    semver: "0.0.1",
    steps: [
      {
        ref: "step_1",
        name: "Welcome Step",
        schema_key: "banner",
        schema_semver: "0.0.1",
        schema_variant_key: "default",
        fields: [],
      },
    ],
    updated_at: "2022-12-31T12:00:00.000000Z",
    created_at: "2022-12-31T12:00:00.000000Z",
    environment: "development",
    ...attrs,
  };
};
