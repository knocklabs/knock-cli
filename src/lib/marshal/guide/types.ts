import { AnyObj } from "@/lib/helpers/object.isomorphic";

import { Conditions } from "../conditions";
import { MaybeWithAnnotation } from "../shared/types";

export type GuideStepData = {
  ref: string;
  name?: string;
  schema_key: string;
  schema_semver: string;
  schema_variant_key: string;
  json_schema: AnyObj;
  values: AnyObj;
};

export type GuideActivationLocationRule = {
  directive: "allow" | "block";
  pathname: string;
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
  active_from?: string | null;
  active_until?: string | null;
  target_audience_key?: string | null;
  target_property_conditions?: Conditions;
  activation_location_rules?: GuideActivationLocationRule[];
  steps: GuideStepData[];
  updated_at: string;
  created_at: string;
  environment: string;
  sha: string;
};

export type GuideInput = AnyObj & {
  key: string;
};
