import { AnyObj } from "@/lib/helpers/object.isomorphic";

import { MaybeWithAnnotation } from "../shared/types";

export enum AudienceType {
  Dynamic = "dynamic",
  Static = "static",
}

export type AudienceCondition = {
  variable: string;
  operator: string;
  argument: string;
};

export type AudienceSegment = {
  conditions: AudienceCondition[];
};

// Audience payload data from the API.
export type AudienceData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  type: AudienceType;
  name: string;
  description?: string;
  dynamic_audience_conditions?: AudienceSegment[];
  environment: string;
  updated_at: string;
  created_at: string;
  sha: string;
};

export type AudienceInput = AnyObj & {
  key: string;
};
