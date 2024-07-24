import { MaybeWithAnnotation } from "../shared/types";

type VariantSchemaBooleanField = {
  type: "boolean";
  key: string;
  label: string;
  settings: {
    required: boolean;
    default: boolean;
    description?: string;
  };
};

type VariantSchemaMarkdownField = {
  type: "markdown";
  key: string;
  label: string;
  settings: {
    required: boolean;
    default: string;
    description?: string;
  };
};

type VariantSchemaTextField = {
  type: "text";
  key: string;
  label: string;
  settings: {
    required: boolean;
    default: string;
    description?: string;
    maxLength?: number;
    minLength?: number;
  };
};

type VariantSchemaTextareaField = {
  type: "textarea";
  key: string;
  label: string;
  settings: {
    required: boolean;
    default: string;
    description?: string;
    maxLength?: number;
    minLength?: number;
  };
};

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
