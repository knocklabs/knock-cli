import { WarehouseSyncData } from "./types";

const TARGET_TYPE_LABELS: Record<WarehouseSyncData["target_type"], string> = {
  user: "Users",
  tenant: "Tenants",
  object: "Objects",
  static_audience_membership: "Audience members",
  subscription: "Subscriptions",
};

/*
 * Formats what a sync writes to, e.g. "Objects (projects)".
 */
export const formatTarget = (
  sync: Pick<WarehouseSyncData, "target_type" | "target">,
): string => {
  const label = TARGET_TYPE_LABELS[sync.target_type];
  const detail = sync.target?.collection ?? sync.target?.audience_key;

  return detail ? `${label} (${detail})` : label;
};

/*
 * Formats where a sync reads from: a table or view, or a SQL query.
 */
export const formatSource = (
  sync: Pick<WarehouseSyncData, "source">,
): string => {
  const { source } = sync;
  if (!source) return "-";
  if (source.mode === "sql") return "SQL query";

  return [source.schema, source.name].filter(Boolean).join(".");
};
