import {
  EnvironmentValues,
  RedactedVariable,
  Variable,
  VariableEntry,
  VariableRequest,
  VariableType,
} from "./types";

// A value is present when the API returned a non-empty string.
export const isPresent = (value: string | null | undefined): boolean =>
  typeof value === "string" && value !== "";

export const displayValue = (
  type: VariableType,
  value: string | null | undefined,
  kind: "default" | "override" = "default",
): string => {
  if (type === "secret") return isPresent(value) ? "set" : "unset";
  if (value === "") return "unset";
  if (typeof value !== "string") return kind === "default" ? "-" : "unset";
  return value;
};

export const formatRedactedDefault = (entry: RedactedVariable): string => {
  if (entry.type === "secret") return entry.value_set ? "set" : "unset";
  return displayValue("public", entry.value, "default");
};

export const formatRedactedEnvironments = (entry: RedactedVariable): string => {
  if (entry.type === "secret") {
    const values = entry.environment_values_set ?? {};
    if (Object.keys(values).length === 0) return "-";
    return Object.entries(values)
      .map(([slug, set]) => `${slug}: ${set ? "set" : "unset"}`)
      .join(", ");
  }

  const values = entry.environment_values ?? {};
  if (Object.keys(values).length === 0) return "-";
  return Object.entries(values)
    .map(
      ([slug, value]) =>
        `${slug}: ${displayValue("public", value, "override")}`,
    )
    .join(", ");
};

const nullMap = (values: EnvironmentValues | undefined): EnvironmentValues => {
  const mapped: EnvironmentValues = {};
  for (const slug of Object.keys(values ?? {})) mapped[slug] = null;
  return mapped;
};

const presenceMap = (
  values: EnvironmentValues | undefined,
): Record<string, boolean> => {
  const mapped: Record<string, boolean> = {};
  for (const [slug, value] of Object.entries(values ?? {})) {
    mapped[slug] = isPresent(value);
  }

  return mapped;
};

export type SecretPresence = {
  value_set: boolean;
  environment_values_set: Record<string, boolean>;
};

// Previous presence plus the fields this write sent. "" unsets. Omission keeps
// the previous presence. The API string is never an input.
export const applySecretWrite = (
  previous: SecretPresence,
  body: VariableRequest,
): SecretPresence => {
  const environmentValuesSet = { ...previous.environment_values_set };

  for (const [slug, value] of Object.entries(body.environment_values ?? {})) {
    environmentValuesSet[slug] = value !== "";
  }

  return {
    value_set:
      body.value === undefined ? previous.value_set : body.value !== "",
    environment_values_set: environmentValuesSet,
  };
};

// Drop secret strings. "", null, and missing mean unset. Any other secret
// string means set, and the string itself is discarded.
export const redactVariable = (
  variable: Variable,
  environment?: string,
): RedactedVariable => {
  const base: RedactedVariable = {
    key: variable.key,
    type: variable.type,
    description: variable.description,
    inserted_at: variable.inserted_at,
    updated_at: variable.updated_at,
    value: variable.type === "secret" ? null : variable.value ?? null,
  };

  if (environment) {
    const scoped: RedactedVariable = { ...base, environment };
    if (variable.type === "secret")
      scoped.value_set = isPresent(variable.value);
    return scoped;
  }

  if (variable.environment_values) {
    base.environment_values =
      variable.type === "secret"
        ? nullMap(variable.environment_values)
        : variable.environment_values;
  }

  if (variable.type === "secret") {
    base.value_set = isPresent(variable.value);
    if (variable.environment_values) {
      base.environment_values_set = presenceMap(variable.environment_values);
    }
  }

  return base;
};

// File entry written by pull. Secret entries store set/unset only.
export const toFileEntry = (variable: Variable): VariableEntry => {
  const entry: VariableEntry = { type: variable.type };

  if (variable.description !== undefined)
    entry.description = variable.description;

  if (variable.type === "secret") {
    entry.value_set = isPresent(variable.value);
    if (variable.environment_values) {
      entry.environment_values_set = presenceMap(variable.environment_values);
    }

    return entry;
  }

  entry.value = variable.value ?? null;
  if (variable.environment_values) {
    entry.environment_values = variable.environment_values;
  }

  return entry;
};

// Patch body for PUT. Null and omitted fields are skipped. "" is sent and
// clears. Presence flags are never sent.
export const entryToRequest = (entry: VariableEntry): VariableRequest => {
  const body: VariableRequest = { type: entry.type };

  if (typeof entry.value === "string") body.value = entry.value;
  if (typeof entry.description === "string")
    body.description = entry.description;

  const environmentValues: Record<string, string> = {};
  for (const [slug, value] of Object.entries(entry.environment_values ?? {})) {
    if (typeof value === "string") environmentValues[slug] = value;
  }

  if (Object.keys(environmentValues).length > 0) {
    body.environment_values = environmentValues;
  }

  return body;
};

export const secretEntryAfterPush = (
  entry: VariableEntry,
  body: VariableRequest,
): VariableEntry => {
  const next: VariableEntry = { type: "secret" };

  if (body.description !== undefined) next.description = body.description;
  else if (entry.description !== undefined)
    next.description = entry.description;

  const previousFlags: Record<string, boolean> = {
    ...entry.environment_values_set,
  };
  for (const [slug, value] of Object.entries(entry.environment_values ?? {})) {
    if (!(slug in previousFlags) && typeof value === "string") {
      previousFlags[slug] = value !== "";
    }
  }

  const presence = applySecretWrite(
    {
      value_set:
        entry.value_set ??
        (typeof entry.value === "string" ? entry.value !== "" : false),
      environment_values_set: previousFlags,
    },
    body,
  );
  next.value_set = presence.value_set;

  if (Object.keys(presence.environment_values_set).length > 0) {
    next.environment_values_set = presence.environment_values_set;
  }

  return next;
};

const partitionEnvironmentValues = (
  values: VariableEntry["environment_values"],
): { sets: string[]; clears: string[] } => {
  const sets: string[] = [];
  const clears: string[] = [];

  for (const [slug, value] of Object.entries(values ?? {})) {
    if (typeof value !== "string") continue;
    if (value === "") clears.push(slug);
    else sets.push(slug);
  }

  return { sets, clears };
};

export const describePushEntry = (entry: VariableEntry): string => {
  const hasValue = typeof entry.value === "string";
  const { sets, clears } = partitionEnvironmentValues(entry.environment_values);

  if (
    entry.type === "secret" &&
    !hasValue &&
    sets.length === 0 &&
    clears.length === 0
  ) {
    return "leave values unchanged";
  }

  if (
    entry.type === "secret" &&
    hasValue &&
    entry.value !== "" &&
    sets.length === 0 &&
    clears.length === 0
  ) {
    return "set default from file, leave overrides unchanged";
  }

  const parts: string[] = [];
  if (hasValue && entry.value === "") parts.push("clear default");
  else if (hasValue && entry.type === "secret")
    parts.push("set default from file");
  else if (hasValue) parts.push("update default");

  for (const slug of sets) parts.push(`set ${slug}`);
  for (const slug of clears) parts.push(`clear ${slug}`);

  return parts.join(", ");
};

export const describeSet = (
  type: VariableType,
  body: VariableRequest,
): string => {
  const parts: string[] = [];

  if (body.value !== undefined) {
    if (body.value === "") parts.push("default cleared");
    else if (type === "secret") parts.push("default value updated");
    else parts.push("default");
  }

  if (body.description !== undefined) {
    parts.push(body.description === "" ? "description cleared" : "description");
  }

  const sets: string[] = [];
  const clears: string[] = [];
  for (const [slug, value] of Object.entries(body.environment_values ?? {})) {
    if (value === "") clears.push(slug);
    else sets.push(slug);
  }

  if (sets.length === 1) parts.push("1 environment override");
  else if (sets.length > 1) parts.push(`${sets.length} environment overrides`);

  for (const slug of clears) parts.push(`${slug} override cleared`);

  return parts.join(", ");
};
