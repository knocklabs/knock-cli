import { Args, Flags } from "@oclif/core";

import { UpsertSchemaResp } from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { formatError, formatErrors, SourceError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import * as Schema from "@/lib/marshal/schema";

export default class SchemaPush extends BaseCommand<typeof SchemaPush> {
  static summary =
    "Push one or more local item schemas to a Knock environment.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to push all schemas from the target schemas directory.",
    }),
    collection: Flags.string({
      summary: "The object collection key for object schemas.",
    }),
    "schemas-dir": CustomFlags.dirPath({
      summary: "The target schemas directory path.",
    }),
  };

  static args = {
    itemType: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    if (flags.all && args.itemType) {
      return this.error(
        `itemType arg \`${args.itemType}\` cannot also be provided when using --all`,
      );
    }

    if (flags.all && flags.collection) {
      return this.error(
        "Flag --collection cannot be provided when using --all",
      );
    }

    return flags.all ? this.pushAllSchemas() : this.pushOneSchema();
  }

  async pushOneSchema(): Promise<void> {
    const { flags } = this.props;
    const itemType = this.parseItemType();
    this.validateCollectionUsage(itemType);

    const schemasDirCtx = await this.getSchemasDirContext();
    const schemaFileCtx = await Schema.schemaFileContext(
      schemasDirCtx.abspath,
      itemType,
      flags.collection,
    );

    const [schema, readErrors] = await Schema.readSchemaFile(schemaFileCtx);
    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    await this.pushSchema({
      ...schemaFileCtx,
      content: this.normalizeSchemaForPush(schema!, itemType, flags.collection),
    });

    const scope = formatCommandScope(flags);
    this.log(`‣ Successfully pushed 1 schema to ${scope}`);
  }

  async pushAllSchemas(): Promise<void> {
    const schemasDirCtx = await this.getSchemasDirContext();
    const [schemas, readErrors] = await Schema.readAllSchemaFiles(
      schemasDirCtx.abspath,
    );

    if (readErrors.length > 0) {
      this.error(formatErrors(readErrors, { prependBy: "\n\n" }));
    }

    if (schemas.length === 0) {
      this.error(`No schema files found in ${schemasDirCtx.abspath}`);
    }

    for (const schema of schemas) {
      // eslint-disable-next-line no-await-in-loop
      await this.pushSchema({
        ...schema,
        content: this.normalizeSchemaForPush(
          schema.content,
          schema.itemType,
          schema.collection,
        ),
      });
    }

    const schemaPaths = schemas.map((schema) => schema.abspath);
    const scope = formatCommandScope(this.props.flags);
    this.log(
      `‣ Successfully pushed ${schemas.length} schema file(s) to ${scope}:\n` +
        indentString(schemaPaths.join("\n"), 4),
    );
  }

  private async pushSchema(
    schema: Schema.SchemaFileDataContext,
  ): Promise<void> {
    try {
      const resp = await withSpinner<UpsertSchemaResp>(
        () =>
          this.apiV1.upsertSchema(
            this.props,
            schema.itemType,
            schema.content,
            schema.collection,
          ),
        { action: "‣ Pushing" },
      );

      if (resp.data.schema) {
        await Schema.writeSchemaFileFromData(schema, resp.data.schema);
      }
    } catch (error) {
      const sourceError = new SourceError(
        (error as Error).message,
        schema.abspath,
        "ApiError",
      );
      this.error(formatError(sourceError));
    }
  }

  private normalizeSchemaForPush(
    schema: Schema.SchemaData,
    itemType: Schema.SchemaItemType,
    collection?: string,
  ): Schema.SchemaData {
    return {
      ...schema,
      item_type: itemType,
      item_id: itemType === "object" ? collection : null,
    };
  }

  private parseItemType(): Schema.SchemaItemType {
    const { itemType } = this.props.args;
    if (!itemType) {
      return this.error("Missing 1 required arg:\nitemType");
    }

    try {
      return Schema.validateSchemaItemType(itemType);
    } catch (error) {
      return this.error((error as Error).message);
    }
  }

  private validateCollectionUsage(itemType: Schema.SchemaItemType): void {
    const { collection } = this.props.flags;

    if (itemType === "object" && !collection) {
      this.error("Flag --collection is required when itemType is `object`");
    }

    if (itemType !== "object" && collection) {
      this.error("Flag --collection can only be provided for object schemas");
    }
  }

  private async getSchemasDirContext() {
    return this.props.flags["schemas-dir"]
      ? this.props.flags["schemas-dir"]
      : Schema.resolveSchemasDir(this.projectConfig, this.runContext.cwd);
  }
}
