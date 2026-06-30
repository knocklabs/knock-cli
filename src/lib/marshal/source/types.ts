import { AnyObj } from "@/lib/helpers/object.isomorphic";

import { MaybeWithAnnotation } from "../shared/types";

export type SourcePreprocessScript = {
  source: string;
  language: "javascript";
};

export type SourceEventActionMapping = {
  event_type: string;
  action_type: string;
  action_parameters: AnyObj | null;
  active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

/*
 * The per-environment `settings` object is open-ended (the API serializes it
 * with `additionalProperties: true`). These are the common fields, but
 * source-type-specific fields may also be present.
 */
export type SourceSettings = AnyObj & {
  endpoint?: string;
  event_type_path?: string | null;
  timestamp_path?: string | null;
  idempotency_key_path?: string | null;
  handle_identifies?: boolean | null;
  enforce_idempotency?: boolean | null;
  enforce_verification?: boolean;
  preprocess_script?: SourcePreprocessScript | null;
};

export type SourceEnvironmentSettings = {
  updated_at: string;
  settings: SourceSettings;
  mappings: SourceEventActionMapping[];
};

/*
 * Source data from the API. `environment_settings` is a map keyed by
 * environment slug; it is returned by `get`, but omitted from the lightweight
 * summaries returned by `list`.
 */
export type SourceData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  name: string;
  description: string | null;
  custom_image_url: string | null;
  created_at: string;
  updated_at: string;
  environment_settings?: Record<string, SourceEnvironmentSettings>;
};
