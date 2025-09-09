import type { MaybeWithAnnotation } from "../shared/types";
import type { HttpFetchStepData, StepType } from "../workflow/types";

/**
 * This only supports HttpFetch steps for now.
 */
export type ReusableStepData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  name: string;
  environment: string;
  /** The step content for this reusable step's current version. Currently only HttpFetch is supported. */
  settings: HttpFetchStepData["settings"];
  type: StepType.HttpFetch;
  created_at: string;
  updated_at: string;
  sha: string;
};
