import type { AnyObj } from "@/lib/helpers/object.isomorphic";

import type { MaybeWithAnnotation } from "../shared/types";
import type { HttpFetchStepData, StepType } from "../workflow/types";

// TODO: update with actual shape from mAPI
export type ReusableStepData<A extends MaybeWithAnnotation = unknown> = A & {
  id: string;
  key: string;
  /** The step content for this reusable step's current version. Currently only HttpFetch is supported. */
  step: HttpFetchStepData;
  type: StepType.HttpFetch;
  created_at: string;
  updated_at: string;
  sha: string;
};

export type ReusableStepInput = AnyObj & {
  key: string;
};
