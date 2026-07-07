import path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DOUBLE_SPACES } from "@/lib/helpers/json";

import {
  SCHEMA_FILE_SCHEMA,
  schemaFileContext,
  schemaFilePath,
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

/*
 * Prunes schema files that are no longer present in the remote set, so a later
 * `schema push --all` cannot push stale schemas back into the environment.
 * Only removes the file shapes push reads (user.json, tenant.json, and
 * objects/<collection>.json); anything else in the directory is left alone.
 */
const pruneSchemasIndexDir = async (
  schemasDirPath: string,
  remoteSchemas: SchemaData[],
): Promise<void> => {
  const expectedPaths = new Set(
    remoteSchemas.map((schema) => {
      const { itemType, collection } = schemaTargetFromData(schema);
      return schemaFilePath(schemasDirPath, itemType, collection);
    }),
  );

  const candidatePaths = [
    path.resolve(schemasDirPath, "user.json"),
    path.resolve(schemasDirPath, "tenant.json"),
  ];

  const objectsDirPath = path.resolve(schemasDirPath, "objects");
  if (await fs.pathExists(objectsDirPath)) {
    const dirents = await fs.readdir(objectsDirPath, { withFileTypes: true });
    for (const dirent of dirents) {
      if (dirent.isFile() && dirent.name.endsWith(".json")) {
        candidatePaths.push(path.resolve(objectsDirPath, dirent.name));
      }
    }
  }

  await Promise.all(
    candidatePaths
      .filter((abspath) => !expectedPaths.has(abspath))
      .map((abspath) => fs.remove(abspath)),
  );
};

export const writeSchemasIndexDir = async (
  schemasDirPath: string,
  schemas: SchemaData[],
): Promise<void> => {
  const dirExists = await fs.pathExists(schemasDirPath);
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));
  let backedUp = false;

  try {
    // If the schemas directory already exists, back it up in the temp sandbox
    // before pruning stale files, so a failed write can restore it.
    if (dirExists) {
      await fs.copy(schemasDirPath, backupDirPath);
      backedUp = true;
      await pruneSchemasIndexDir(schemasDirPath, schemas);
    }

    for (const schema of schemas) {
      const { itemType, collection } = schemaTargetFromData(schema);
      // eslint-disable-next-line no-await-in-loop
      const ctx = await schemaFileContext(schemasDirPath, itemType, collection);
      // eslint-disable-next-line no-await-in-loop
      await writeSchemaFileFromData(ctx, schema);
    }
  } catch (error) {
    // In case of any error, wipe the schemas directory that is likely in a bad
    // state then restore the backup, but only when the backup completed. If
    // the backup copy itself failed, nothing has touched the original tree, so
    // leave it alone.
    if (dirExists && backedUp) {
      await fs.emptyDir(schemasDirPath);
      await fs.copy(backupDirPath, schemasDirPath);
    } else if (!dirExists) {
      await fs.remove(schemasDirPath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};
