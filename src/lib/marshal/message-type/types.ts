import { AnyObj } from "@/lib/helpers/object.isomorphic";

import { MaybeWithAnnotation } from "../shared/types";

type VariantSchemaBooleanField = {
  type: "boolean";
  key: string;
  label: string;
  settings: Record<string, unknown>;
};

type VariantSchemaMarkdownField = {
  type: "markdown";
  key: string;
  label: string;
  settings: Record<string, unknown>;
};

type VariantSchemaTextField = {
  type: "text";
  key: string;
  label: string;
  settings: Record<string, unknown>;
};

type VariantSchemaTextareaField = {
  type: "textarea";
  key: string;
  label: string;
  settings: Record<string, unknown>;
};

// TODO: Type the remaining schema field types.
type MessageTypeVariantSchemaField =
  | VariantSchemaBooleanField
  | VariantSchemaMarkdownField
  | VariantSchemaTextField
  | VariantSchemaTextareaField;

type MessageTypeVariantSchema = {
  fields: MessageTypeVariantSchemaField[];
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
};

export type MessageTypeInput = AnyObj & {
  key: string;
};
