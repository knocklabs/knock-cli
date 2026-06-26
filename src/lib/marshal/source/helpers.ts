import { SourceEventActionMapping, SourceSettings } from "./types";

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
