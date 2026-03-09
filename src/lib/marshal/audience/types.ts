import { AnyObj } from "@/lib/helpers/object.isomorphic";

import { MaybeWithAnnotation } from "../shared/types";

export enum AudienceType {
  Static = "static",
  Dynamic = "dynamic",
}

export type AudienceCondition = {
  property: string;
  operator: string;
  argument?: string;
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
  segments?: AudienceSegment[];
  environment: string;
  created_at: string;
  updated_at: string;
  sha: string;
};

export type AudienceInput = AnyObj & {
  key: string;
};
