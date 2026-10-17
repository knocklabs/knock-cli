import {
  VARIABLE_KEY_PATTERN,
  VARIABLE_TYPES,
  VariableEntry,
  VariablesFile,
  VariableType,
} from "./types";

const isStringOrNull = (value: unknown): value is string | null =>
  typeof value === "string" || value === null;

export const validateVariableKey = (key: string): string | undefined => {
  if (!VARIABLE_KEY_PATTERN.test(key)) {
    return `Invalid variable key \`${key}\`. Keys must match ${VARIABLE_KEY_PATTERN}.`;
  }
};

export const validateEntry = (key: string, entry: unknown): string[] => {
  const errors: string[] = [];
  const keyError = validateVariableKey(key);
  if (keyError) errors.push(keyError);

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    errors.push(`\`${key}\` must be an object.`);
    return errors;
  }

  const record = entry as VariableEntry;

  if (record.key !== undefined && record.key !== key) {
    errors.push(`\`${key}\` key does not match the property name.`);
  }

  if (!VARIABLE_TYPES.includes(record.type)) {
    errors.push(`\`${key}\` type must be public or secret.`);
    return errors;
  }

  if (record.value !== undefined && !isStringOrNull(record.value)) {
    errors.push(`\`${key}\` value must be a string or null.`);
  }

  if (record.description !== undefined && !isStringOrNull(record.description)) {
    errors.push(`\`${key}\` description must be a string or null.`);
  }

  if (
    record.type === "public" &&
    (record.value_set !== undefined ||
      record.environment_values_set !== undefined)
  ) {
    errors.push(`\`${key}\` is public and cannot include value_set.`);
  }

  if (record.type === "secret")
    errors.push(...validateSecretFlags(key, record));
  errors.push(...validateEnvironmentValues(key, record.environment_values));

  return errors;
};

const validateSecretFlags = (key: string, record: VariableEntry): string[] => {
  const errors: string[] = [];

  if (record.value_set !== undefined && typeof record.value_set !== "boolean") {
    errors.push(`\`${key}\` value_set must be a boolean.`);
  }

  if (
    record.environment_values_set !== undefined &&
    !isBooleanMap(record.environment_values_set)
  ) {
    errors.push(`\`${key}\` environment_values_set must be booleans.`);
  }

  return errors;
};

const validateEnvironmentValues = (
  key: string,
  values: VariableEntry["environment_values"],
): string[] => {
  if (values === undefined) return [];

  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return [`\`${key}\` environment_values must be an object.`];
  }

  return Object.entries(values).flatMap(([slug, value]) =>
    isStringOrNull(value)
      ? []
      : [`\`${key}\` environment_values.${slug} must be a string or null.`],
  );
};

const isBooleanMap = (value: unknown): boolean => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((item) => typeof item === "boolean");
};

export const validateVariablesFile = (file: VariablesFile): string[] =>
  Object.entries(file).flatMap(([key, entry]) => validateEntry(key, entry));

export const isVariableType = (value: string): value is VariableType =>
  VARIABLE_TYPES.includes(value as VariableType);
