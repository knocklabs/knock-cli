export type KeyValueBlock = {
  key: string;
  value: string;
};

export type Duration = {
  unit: string;
  value: number;
};

export type ExtractionSettings = {
  default: boolean;
  file_ext: string;
};

export type Hyperlink = {
  text: string;
  url: string;
};

/**
 * Attaches a goal to a workflow, guide, or broadcast for attribution tracking.
 * Matches @knocklabs/mgmt Shared.GoalAttachment.
 */
export type GoalAttachment = {
  goal_key: string;
  attribution_window_days?: number;
};

type SchemaAnnotation = {
  readonly_fields: string[];
  extractable_fields: {
    [field: string]: ExtractionSettings;
  };
};

export type WithAnnotation = {
  __annotation: SchemaAnnotation | null;
};

export type MaybeWithAnnotation = WithAnnotation | unknown;
