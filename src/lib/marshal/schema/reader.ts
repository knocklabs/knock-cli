import path from "node:path";

import * as fs from "fs-extra";

import { formatErrors, SourceError } from "@/lib/helpers/error";
import { readJson } from "@/lib/helpers/json";
import { omitDeep } from "@/lib/helpers/object.isomorphic";

import { schemaFileContext, validateSchemaItemType } from "./helpers";
import { SchemaData, SchemaFileContext, SchemaFileDataContext } from "./types";

export const readSchemaFile = async (
  schemaFileCtx: SchemaFileContext,
): Promise<[SchemaData | undefined, SourceError[]]> => {
  if (!schemaFileCtx.exists) {
    throw new Error(
      `Cannot locate schema file at \`${schemaFileCtx.abspath}\``,
    );
  }

  const [schemaJson, readErrors] = await readJson(schemaFileCtx.abspath);
  if (!schemaJson) {
    return [
      undefined,
      [new SourceError(formatErrors(readErrors), schemaFileCtx.abspath)],
    ];
  }

  const schema = omitDeep(schemaJson, ["$schema", "__readonly"]) as SchemaData;
  return [schema, []];
};

export const readAllSchemaFiles = async (
  schemasDirPath: string,
): Promise<[SchemaFileDataContext[], SourceError[]]> => {
  if (!(await fs.pathExists(schemasDirPath))) {
    throw new Error(`Cannot locate schema files in \`${schemasDirPath}\``);
  }

  const schemas: SchemaFileDataContext[] = [];
  const errors: SourceError[] = [];

  for (const itemType of ["user", "tenant"] as const) {
    // eslint-disable-next-line no-await-in-loop
    const ctx = await schemaFileContext(schemasDirPath, itemType);
    if (!ctx.exists) continue;

    // eslint-disable-next-line no-await-in-loop
    const [content, readErrors] = await readSchemaFile(ctx);
    if (readErrors.length > 0) {
      errors.push(...readErrors);
      continue;
    }

    schemas.push({ ...ctx, content: content! });
  }

  const objectsDirPath = path.resolve(schemasDirPath, "objects");
  if (await fs.pathExists(objectsDirPath)) {
    const dirents = await fs.readdir(objectsDirPath, { withFileTypes: true });

    for (const dirent of dirents) {
      if (!dirent.isFile() || !dirent.name.endsWith(".json")) continue;

      const collection = path.basename(dirent.name, ".json");

      // An invalid filename (e.g. `..json`) fails collection validation;
      // collect it like any other read error instead of aborting the run.
      let ctx: SchemaFileContext;
      try {
        // eslint-disable-next-line no-await-in-loop
        ctx = await schemaFileContext(schemasDirPath, "object", collection);
      } catch (error) {
        errors.push(
          new SourceError(
            (error as Error).message,
            path.resolve(objectsDirPath, dirent.name),
            "ReadError",
          ),
        );
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const [content, readErrors] = await readSchemaFile(ctx);
      if (readErrors.length > 0) {
        errors.push(...readErrors);
        continue;
      }

      schemas.push({ ...ctx, content: content! });
    }
  }

  const validated: SchemaFileDataContext[] = [];
  for (const schema of schemas) {
    try {
      const itemType = validateSchemaItemType(schema.content.item_type);

      // The file path determines where a schema is pushed, so a file that
      // declares a different item_type is ambiguous. Error instead of silently
      // reinterpreting it.
      if (itemType !== schema.itemType) {
        throw new Error(
          `Schema file declares item_type \`${itemType}\` but its file path implies \`${schema.itemType}\``,
        );
      }

      // Same for an object schema whose declared item_id disagrees with its
      // objects/<collection>.json path.
      if (
        itemType === "object" &&
        schema.content.item_id &&
        schema.content.item_id !== schema.collection
      ) {
        throw new Error(
          `Schema file declares item_id \`${schema.content.item_id}\` but its file path implies \`${schema.collection}\``,
        );
      }

      validated.push({
        ...schema,
        content: { ...schema.content, item_type: itemType },
      });
    } catch (error) {
      errors.push(
        new SourceError((error as Error).message, schema.abspath, "ReadError"),
      );
    }
  }

  return [validated, errors];
};
