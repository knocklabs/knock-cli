import { omit, pick } from "lodash";

import { AnyObj } from "@/lib/helpers/object.isomorphic";

import { WarehouseSyncData } from "./types";

export type WarehouseSyncInput = AnyObj & { key: string };

export const WAREHOUSE_SYNC_JSON = "warehouse_sync.json";

// The fields a push sends. Settings (enabled, frequency_minutes) take effect
// right away, so they're changed in the dashboard, not by a push.
const WRITABLE_FIELDS = [
  "name",
  "description",
  "warehouse_key",
  "target_type",
  "target",
  "source",
  "primary_key_column",
  "change_tracking",
  "mappings",
];

const CLEARABLE_FIELDS = {
  description: null,
  source: null,
  change_tracking: null,
};

// Volatile fields that change per environment or over time, excluded to avoid noisy diffs
const REMOVED_READONLY_FIELDS = [
  "sha",
  "updated_at",
  "environment",
  "created_at",
];

/*
 * Builds the warehouse_sync.json content from a sync, moving the fields a push
 * doesn't send under "__readonly".
 */
export const buildWarehouseSyncJson = (
  remoteWarehouseSync: WarehouseSyncData,
): AnyObj => {
  // The API leaves out empty optional fields. Writing them as null lets a push
  // clear them in another environment too.
  const writable = {
    ...CLEARABLE_FIELDS,
    ...pick(remoteWarehouseSync, WRITABLE_FIELDS),
  };
  const readonly = omit(remoteWarehouseSync, [
    ...WRITABLE_FIELDS,
    ...REMOVED_READONLY_FIELDS,
  ]);

  return { ...writable, __readonly: readonly };
};

/*
 * Builds the payload for upsert and validate from local file content.
 */
export const toWarehouseSyncInput = (
  key: string,
  content: AnyObj,
): WarehouseSyncInput => ({ ...pick(content, WRITABLE_FIELDS), key });
