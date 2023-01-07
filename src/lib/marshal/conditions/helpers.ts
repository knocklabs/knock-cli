import { Condition, Conditions, NestedConditions } from "./types";

const formatConditionsList = (
  conditions: Condition[],
  joinedBy: "or" | "and",
  appendedBy = "",
): string =>
  conditions
    .map((c) => `"${c.variable}" ${c.operator} "${c.argument}"`)
    .join(`; ${joinedBy.toUpperCase()}\n`) + appendedBy;

const formatNestedConditions = (
  nestedConds: NestedConditions[],
  joinedBy: "or" | "and",
  appendedBy = "",
): string =>
  nestedConds
    .map(({ any, all }) => {
      if (any) return formatConditionsList(any, "or");
      if (all) return formatConditionsList(all, "and");
      throw new Error(`Invalid nested conditions: ${nestedConds}`);
    })
    .join(`\n ${joinedBy.toUpperCase()}\n`) + appendedBy;

export const formatConditions = (conditions: Conditions): string => {
  const { any, all } = conditions;

  if (any) {
    const [condition] = any;

    return "variable" in condition
      ? formatConditionsList(any as Condition[], "or", "\n")
      : formatNestedConditions(any as NestedConditions[], "or", "\n");
  }

  if (all) {
    const [condition] = all;

    return "variable" in condition
      ? formatConditionsList(all as Condition[], "and", "\n")
      : formatNestedConditions(all as NestedConditions[], "and", "\n");
  }

  throw new Error(`Invalid conditions: ${conditions}`);
};
