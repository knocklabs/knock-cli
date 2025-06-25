import { AnyObj } from "@/lib/helpers/object.isomorphic";

import { MaybeWithAnnotation } from "../shared/types";

type BaseField = {
  key: string;
  label: string;
  settings: Record<string, unknown>;
};

type TextField = BaseField & {
  type: "text";
  value?: string | null;
};

type TextareaField = BaseField & {
  type: "textarea";
  value?: string | null;
};

type MarkdownField = BaseField & {
  type: "markdown";
  value?: string | null;
};

type BooleanField = BaseField & {
  type: "boolean";
  value?: boolean | null;
};

type SelectField = BaseField & {
  type: "select";
  value?: string | null;
};

type MultiSelectField = BaseField & {
  type: "multi_select";
  value?: string[] | null;
};

type ButtonField = BaseField & {
  type: "button";
  text: TextField;
  action: TextField;
};

type ContentSchemaField =
  | TextField
  | TextareaField
  | MarkdownField
  | BooleanField
  | SelectField
  | MultiSelectField
  | ButtonField;

type MessageTypeVariantSchema = {
  fields: ContentSchemaField[];
  key: string;
  name: string;
};

// Message type payload data from the API.
export type MessageTypeData<A extends MaybeWithAnnotation = unknown> = A & {
  key: string;
  valid: boolean;
  owner: "system" | "user";
  name: string;
  variants: MessageTypeVariantSchema[];
  preview: string;
  semver: string | null;
  description?: string;
  icon_name?: string;
  updated_at: string;
  created_at: string;
  environment: string;
  sha?: string;
};

export type MessageTypeInput = AnyObj & {
  key: string;
};
