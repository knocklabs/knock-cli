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
