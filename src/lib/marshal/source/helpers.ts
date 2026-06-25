import { SourceEventActionMapping, SourceSettings } from "./types";

/*
 * The common `settings` fields to surface in the source detail view, in
 * display order. The settings object is open-ended, so this is a curated
 * subset; the full object is always available via `--json`.
 */
export const SOURCE_SETTINGS_DISPLAY: Array<{
  key: keyof SourceSettings;
  label: string;
}> = [
  { key: "endpoint", label: "Endpoint" },
  { key: "event_type_path", label: "Event type path" },
  { key: "timestamp_path", label: "Timestamp path" },
  { key: "idempotency_key_path", label: "Idempotency key path" },
  { key: "enforce_verification", label: "Enforce verification" },
];

export const formatSettingValue = (value: unknown): string => {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

export const formatPreprocessScript = (settings: SourceSettings): string =>
  settings.preprocess_script ? settings.preprocess_script.language : "-";

export const formatMappingStatus = (
  mapping: SourceEventActionMapping,
): string => (mapping.active ? "Active" : "Inactive");
