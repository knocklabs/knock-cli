import * as fs from "fs-extra";

import { DOUBLE_SPACES } from "@/lib/helpers/json";

import {
  SCHEMA_FILE_SCHEMA,
  schemaFileContext,
  schemaTargetFromData,
} from "./helpers";
import { SchemaData, SchemaFileContext } from "./types";

export const schemaJsonForWrite = (
  schema: SchemaData,
): Record<string, unknown> => ({
  $schema: SCHEMA_FILE_SCHEMA,
  item_type: schema.item_type,
  item_id: schema.item_id ?? null,
  properties: schema.properties,
  __readonly: {
    item_type: schema.item_type,
    item_id: schema.item_id ?? null,
  },
});

export const writeSchemaFileFromData = async (
  schemaFileCtx: SchemaFileContext,
  schema: SchemaData,
): Promise<void> => {
  await fs.outputJson(schemaFileCtx.abspath, schemaJsonForWrite(schema), {
    spaces: DOUBLE_SPACES,
  });
};

export const writeSchemasIndexDir = async (
  schemasDirPath: string,
  schemas: SchemaData[],
): Promise<void> => {
  for (const schema of schemas) {
    const { itemType, collection } = schemaTargetFromData(schema);
    // eslint-disable-next-line no-await-in-loop
    const ctx = await schemaFileContext(schemasDirPath, itemType, collection);
    // eslint-disable-next-line no-await-in-loop
    await writeSchemaFileFromData(ctx, schema);
  }
};
