import { AxiosResponse } from "axios";

import { GFlags } from "@/lib/api-v1";
import { Props } from "@/lib/base-command";
import { PageInfo } from "@/lib/helpers/page";
import { WorkflowData } from "@/lib/marshal/workflow";

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
