export const VARIABLE_TYPES = ["public", "secret"] as const;

export type VariableType = (typeof VARIABLE_TYPES)[number];

// Liquid identifiers used as `{{ vars.<key> }}`. Stricter than the API, which
// types `key` only as a string.
export const VARIABLE_KEY_PATTERN = /^[A-Z_a-z]\w*$/;

export type EnvironmentValues = Record<string, string | null>;

/**
 * Variable object returned by the management API.
 * Secret `value` strings are obfuscated and must be discarded by the CLI.
 */
export type Variable = {
  key: string;
  type: VariableType;
  inserted_at: string;
  updated_at: string;
  description?: string | null;
  environment_values?: EnvironmentValues;
  value?: string | null;
};

export type VariableRequest = {
  type: VariableType;
  value?: string;
  description?: string;
  environment_values?: Record<string, string>;
};

/**
 * One entry inside variables.json. The property name on the file is the key.
 */
export type VariableEntry = {
  type: VariableType;
  description?: string | null;
  value?: string | null;
  environment_values?: EnvironmentValues;
  value_set?: boolean;
  environment_values_set?: Record<string, boolean>;
  key?: string;
};

export type VariablesFile = Record<string, VariableEntry>;

export type RedactedVariable = {
  key: string;
  type: VariableType;
  inserted_at: string;
  updated_at: string;
  description?: string | null;
  value: string | null;
  environment?: string;
  value_set?: boolean;
  environment_values?: EnvironmentValues;
  environment_values_set?: Record<string, boolean>;
};

export const BRANCH_ERROR = "Variables are not branch-scoped. Remove --branch.";

export const PULL_ENVIRONMENT_ERROR =
  "Variable pull always fetches the project catalog, including every environment override. --environment is not accepted.";
