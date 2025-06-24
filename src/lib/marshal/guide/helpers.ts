import { GuideActivationLocationRule, GuideData, GuideStepData } from "./types";

export const formatStatusWithSchedule = (guide: GuideData): string => {
  const baseStatus = guide.active ? "Active" : "Inactive";

  if (guide.active_from || guide.active_until) {
    const fromText = guide.active_from
      ? `from ${guide.active_from}`
      : "immediately";
    const untilText = guide.active_until
      ? `until ${guide.active_until}`
      : "with no end time";
    return `${baseStatus} (${fromText} ${untilText})`;
  }

  return baseStatus;
};

export const formatStep = (step: GuideStepData): string => {
  return `${step.schema_key} (${step.schema_variant_key})`;
};

export const formatActivationRules = (
  rules?: GuideActivationLocationRule[],
): string => {
  if (!rules || !Array.isArray(rules)) return "-";

  return rules
    .map(({ directive, pathname }) => `${directive} ${pathname}`)
    .join(", ");
};
