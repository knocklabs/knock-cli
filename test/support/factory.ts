import { randomUUID } from "node:crypto";

import type { Branch } from "@knocklabs/mgmt/resources/branches";
import { Channel } from "@knocklabs/mgmt/resources/channels";
import type { Commit } from "@knocklabs/mgmt/resources/commits";
import { Environment } from "@knocklabs/mgmt/resources/environments";
import { AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { type WhoamiResp } from "@/lib/api-v1";
import { AuthenticatedSession } from "@/lib/auth";
import { BFlags, Props } from "@/lib/base-command";
import { PageInfo, PaginatedResp } from "@/lib/helpers/page";
import { EmailLayoutData } from "@/lib/marshal/email-layout";
import { GuideData } from "@/lib/marshal/guide";
import { MessageTypeData } from "@/lib/marshal/message-type";
import { PartialData, PartialType } from "@/lib/marshal/partial";
import { ReusableStepData } from "@/lib/marshal/reusable-step";
import { TranslationData } from "@/lib/marshal/translation";
import {
  ChannelStepData,
  ChannelType,
  StepType,
  WorkflowData,
} from "@/lib/marshal/workflow";
import { ServiceTokenContext, SessionContext } from "@/lib/types";

import { sequence } from "./helpers";

export const sessionContext = (
  attrs: Partial<SessionContext> = {},
): SessionContext => {
  return {
    type: "service",
    token: "valid-token",
    apiOrigin: "https://api.knock.app",
    dashboardOrigin: "https://dashboard.knock.app",
    authOrigin: "https://auth.knock.app",
    ...attrs,
  } as ServiceTokenContext;
};

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

export const paginatedResp = <T>(
  entries: T[],
  pageInfoAttrs: Partial<PageInfo> = {},
): PaginatedResp<T> => {
  return {
    entries,
    page_info: pageInfo(pageInfoAttrs),
  };
};

export const whoami = (attrs: Partial<WhoamiResp> = {}): WhoamiResp => {
  return {
    account_name: "Test Account",
    account_slug: "test-account",
    service_token_name: "test-service-token",
    user_id: null,
    account_features: {
      translations_allowed: true,
    },
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

export const commit = (attrs: Partial<Commit> = {}): Commit => {
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
    sha: "<SOME_SHA>",
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
        values: {},
      },
    ],
    updated_at: "2022-12-31T12:00:00.000000Z",
    created_at: "2022-12-31T12:00:00.000000Z",
    environment: "development",
    sha: "<SOME_SHA>",
    ...attrs,
  };
};

export const branch = (attrs: Partial<Branch> = {}): Branch => {
  return {
    slug: "test-branch",
    created_at: "2025-09-15T17:10:20.755005Z",
    updated_at: "2025-09-15T17:10:20.755005Z",
    last_commit_at: "2025-09-15T17:12:54.948275Z",
    deleted_at: null,
    ...attrs,
  };
};

export const authenticatedSession = (
  attrs: Partial<AuthenticatedSession> = {},
): AuthenticatedSession => {
  return {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    idToken: "test-id-token",
    expiresAt: new Date(Date.now() + 3600 * 1000),
    clientId: "test-client-id",
    ...attrs,
  };
};

export const reusableStep = (
  attrs: Partial<ReusableStepData> = {},
): ReusableStepData => {
  return {
    key: "fetch-user-data",
    name: "Fetch User Data",
    environment: "development",
    type: StepType.HttpFetch,
    settings: {
      url: "https://api.example.com/users/{{ recipient.id }}",
      method: "GET",
      headers: [
        { key: "Authorization", value: "Bearer {{ data.api_token }}" },
        { key: "Content-Type", value: "application/json" },
      ],
    },
    created_at: "2022-12-31T12:00:00.000000Z",
    updated_at: "2022-12-31T12:00:00.000000Z",
    sha: "<SOME_SHA>",
    ...attrs,
  };
};

export const channel = (attrs: Partial<Channel> = {}): Channel => {
  return {
    key: "test-channel",
    name: "Test Channel",
    type: "email",
    ...attrs,
  } as any as Channel;
};

export const environment = (attrs: Partial<Environment> = {}): Environment => {
  return {
    slug: "test-environment",
    name: "Test Environment",
    order: 1,
    owner: "user",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...attrs,
  } as any as Environment;
};
