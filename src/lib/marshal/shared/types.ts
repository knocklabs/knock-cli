export type KeyValueBlock = {
  key: string;
  value: string;
};

export type Duration = {
  unit: string;
  value: number;
};

type SchemaAnnotation = {
  readonly_fields: string[];
  extractable_fields: {
    [field: string]: {
      default: boolean;
      file_ext: string;
    };
  };
};

export type WithAnnotation = {
  __annotation: SchemaAnnotation | null;
};

export type MaybeWithAnnotation = WithAnnotation | unknown;
