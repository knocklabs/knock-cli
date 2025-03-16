import { AnyObj } from "@/lib/helpers/object.isomorphic";

import { ContentSchemaField } from "../message-type";
import { MaybeWithAnnotation } from "../shared/types";

type GuideStepData = {
  ref: string;
  name?: string;
  schema_key: string;
  schema_semver: string;
  schema_variant_key: string;
  fields: ContentSchemaField[];
};

// Guide data from the API.
export type GuideData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  valid: boolean;
  active: boolean;
  name: string;
  description?: string;
  priority?: string;
  channel_key: string | null;
  type: string | null;
  semver: string | null;
  steps: GuideStepData[];
  updated_at: string;
  created_at: string;
  environment: string;
};

export type GuideInput = AnyObj & {
  key: string;
};
