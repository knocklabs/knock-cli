import { MaybeWithAnnotation } from "../shared/types";

export enum ReusableRequestType {
  HttpFetch = "http_fetch",
}

export const REUSABLE_REQUEST_HTTP_METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
] as const;

export type ReusableRequestHttpMethod =
  (typeof REUSABLE_REQUEST_HTTP_METHODS)[number];

export type ReusableRequestKeyValue = {
  key: string;
  value: string;
};

/*
 * Headers and query params are either a template string or a list of
 * key-value pairs.
 */
export type ReusableRequestTemplate = string | ReusableRequestKeyValue[];

export type ReusableRequestCondition = {
  variable: string;
  operator: string;
  argument?: string | null;
};

export type ReusableRequestConditionGroup =
  | {
      all: ReusableRequestCondition[];
    }
  | {
      any: Array<
        ReusableRequestCondition | { all: ReusableRequestCondition[] }
      >;
    };

export type ReusableRequestSettings = {
  method: ReusableRequestHttpMethod;
  url?: string;
  body?: string | null;
  headers?: ReusableRequestTemplate;
  query_params?: ReusableRequestTemplate;
  response_path?: string | null;
  signing_key?: string | null;
  data_input_schema?: Record<string, unknown> | null;
  data_input_values_str?: string | null;
};

// Reusable request payload data from the API.
export type ReusableRequestData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  type: ReusableRequestType;
  environment: string;
  created_at: string;
  updated_at: string;
  settings: ReusableRequestSettings;
  name?: string | null;
  description?: string | null;
  conditions?: ReusableRequestConditionGroup | null;
  sha?: string | null;
};

/*
 * Fields accepted by upsert and validate. The key is a path parameter, not
 * part of the request body.
 */
export type ReusableRequestInput = {
  type: ReusableRequestType;
  settings: ReusableRequestSettings;
  name?: string | null;
  description?: string | null;
  conditions?: ReusableRequestConditionGroup | null;
};
