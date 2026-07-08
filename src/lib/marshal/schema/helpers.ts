import path from "node:path";

import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import { ProjectConfig } from "@/lib/helpers/project-config";

import {
  SCHEMA_ITEM_TYPES,
  SchemaData,
  SchemaFileContext,
  SchemaItemType,
} from "./types";

export const SCHEMA_FILE_SCHEMA = "https://schemas.knock.app/cli/schema.json";

export const isSchemaItemType = (value: string): value is SchemaItemType =>
  SCHEMA_ITEM_TYPES.includes(value as SchemaItemType);

export const validateSchemaItemType = (value: string): SchemaItemType => {
  if (!isSchemaItemType(value)) {
    throw new Error(
      `Invalid item type \`${value}\`. Must be one of: ${SCHEMA_ITEM_TYPES.join(
        ", ",
      )}`,
    );
  }

  return value;
};

export const validateSchemaCollection = (collection: string): string => {
  if (
    !collection ||
    collection.includes("/") ||
    collection.includes("\\") ||
    collection === "." ||
    collection === ".."
  ) {
    throw new Error(`Invalid object collection \`${collection}\``);
  }

  return collection;
};

export const resolveSchemasDir = async (
  projectConfig: ProjectConfig | undefined,
  basePath: string,
): Promise<DirContext> => {
  const schemasDirPath = projectConfig
    ? path.resolve(
        path.isAbsolute(projectConfig.knockDir)
          ? projectConfig.knockDir
          : path.resolve(basePath, projectConfig.knockDir),
        "schemas",
      )
    : path.resolve(basePath, "schemas");

  const exists = await fs.pathExists(schemasDirPath);
  if (exists && !(await fs.lstat(schemasDirPath)).isDirectory()) {
    throw new Error(`${schemasDirPath} is not a directory`);
  }

  return { abspath: schemasDirPath, exists };
};

export const schemaFilePath = (
  schemasDirPath: string,
  itemType: SchemaItemType,
  collection?: string,
): string => {
  if (itemType === "object") {
    return path.resolve(
      schemasDirPath,
      "objects",
      `${validateSchemaCollection(collection ?? "")}.json`,
    );
  }

  return path.resolve(schemasDirPath, `${itemType}.json`);
};

export const schemaFileContext = async (
  schemasDirPath: string,
  itemType: SchemaItemType,
  collection?: string,
): Promise<SchemaFileContext> => {
  const abspath = schemaFilePath(schemasDirPath, itemType, collection);
  const exists = await fs.pathExists(abspath);

  if (exists && !(await fs.lstat(abspath)).isFile()) {
    throw new Error(`${abspath} is not a file`);
  }

  return { itemType, collection, abspath, exists };
};

export const schemaTargetFromData = (
  schema: SchemaData,
): { itemType: SchemaItemType; collection?: string } => {
  const itemType = validateSchemaItemType(schema.item_type);

  if (itemType === "object") {
    return {
      itemType,
      collection: validateSchemaCollection(schema.item_id ?? ""),
    };
  }

  return { itemType };
};
