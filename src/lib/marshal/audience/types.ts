import { AnyObj } from "@/lib/helpers/object.isomorphic";

import { MaybeWithAnnotation } from "../shared/types";

// Audience payload data from the API.
export type AudienceData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  name: string;
  description?: string;
  conditions: string;
  environment: string;
  updated_at: string;
  created_at: string;
  sha: string;
};

export type AudienceInput = AnyObj & {
  key: string;
};
