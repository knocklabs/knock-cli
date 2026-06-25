export const SCHEMA_ITEM_TYPES = ["user", "tenant", "object"] as const;

export type SchemaItemType = (typeof SCHEMA_ITEM_TYPES)[number];

export type SchemaProperty = {
  key: string;
  label?: string | null;
  description?: string | null;
  type?: string | null;
  item_type?: string | null;
  preview_text?: string | null;
  visible?: boolean | null;
};

export type SchemaData = {
  item_type: SchemaItemType;
  item_id?: string | null;
  properties: SchemaProperty[];
};

export type SchemaFileData = SchemaData & {
  $schema?: string;
  __readonly?: {
    item_type?: SchemaItemType;
    item_id?: string | null;
  };
};

export type SchemaFileContext = {
  itemType: SchemaItemType;
  collection?: string;
  abspath: string;
  exists: boolean;
};

export type SchemaFileDataContext = SchemaFileContext & {
  content: SchemaData;
};
