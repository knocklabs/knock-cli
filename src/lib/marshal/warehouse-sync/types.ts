import { AnyObj } from "@/lib/helpers/object.isomorphic";

export type WarehouseConnectionStatus =
  | "not_configured"
  | "key_not_installed"
  | "failed"
  | "connecting"
  | "untested"
  | "connected";

/*
 * Warehouse data from the API. Connection settings hold no secrets, and
 * their fields depend on the warehouse type.
 */
export type WarehouseData = {
  key: string;
  name: string;
  type: string;
  connection_settings: AnyObj | null;
  connection_status: WarehouseConnectionStatus;
  connection_error: string | null;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WarehouseSyncTargetType =
  | "user"
  | "tenant"
  | "object"
  | "static_audience_membership"
  | "subscription";

export type WarehouseSyncStatus =
  | "draft"
  | "publishing"
  | "delivery_failed"
  | "paused"
  | "needs_attention"
  | "live";

export type WarehouseSyncSource = {
  mode: "relation" | "sql";
  schema?: string | null;
  name?: string | null;
  query?: string | null;
};

export type WarehouseSyncMapping = {
  source_column: string;
  target_field: string;
  on_null?: "set_null" | "preserve";
};

/*
 * Warehouse sync data from the API: the versioned definition, plus the
 * sync's settings and status, which aren't versioned. A draft can leave out
 * any optional definition field.
 */
export type WarehouseSyncData = {
  key: string;
  name: string;
  description?: string;
  environment: string;
  source?: WarehouseSyncSource;
  primary_key_column?: string;
  change_tracking?: AnyObj;
  mappings: WarehouseSyncMapping[];
  policies?: AnyObj;
  version_id: string;
  warehouse_key: string;
  target_type: WarehouseSyncTargetType;
  target: { collection?: string; audience_key?: string } | null;
  enabled: boolean;
  frequency_minutes: number;
  status: WarehouseSyncStatus;
  has_unpublished_changes: boolean;
  last_published_at: string | null;
  publish_error: string | null;
  last_failure: { stage: string; message: string } | null;
  sha: string;
  created_at: string;
  updated_at: string;
};

export type WarehouseSyncRunStatus =
  | "running"
  | "completed"
  | "completed_with_errors"
  | "failed";

export type WarehouseSyncRun = {
  id: string;
  status: WarehouseSyncRunStatus;
  submitted_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  records_processed: number | null;
  records_errored: number | null;
  rows_applied: number | null;
  rows_failed: number | null;
  error: { stage: string; message: string } | null;
};
