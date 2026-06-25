import { Args, Flags, ux } from "@oclif/core";

import { GetSchemaResp, ListSchemaResp } from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";
import * as Schema from "@/lib/marshal/schema";

export default class SchemaPull extends BaseCommand<typeof SchemaPull> {
  static summary =
    "Pull one or more item schemas from an environment into a local file system.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary:
        "Whether to pull all item schemas from the specified environment.",
    }),
    collection: Flags.string({
      summary: "The object collection key for object schemas.",
    }),
    "schemas-dir": CustomFlags.dirPath({
      summary: "The target schemas directory path.",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
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

    return flags.all ? this.pullAllSchemas() : this.pullOneSchema();
  }

  async pullOneSchema(): Promise<void> {
    const { flags } = this.props;
    const itemType = this.parseItemType();
    this.validateCollectionUsage(itemType);

    const schemasDirCtx = await this.getSchemasDirContext();
    const schemaFileCtx = await Schema.schemaFileContext(
      schemasDirCtx.abspath,
      itemType,
      flags.collection,
    );

    if (schemaFileCtx.exists) {
      const prompt = `Overwrite schema file at ${schemaFileCtx.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    } else {
      const prompt = `Create a new schema file at ${schemaFileCtx.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    }

    const resp = await withSpinner<GetSchemaResp>(
      () => this.apiV1.getSchema(this.props, itemType, flags.collection),
      { action: "‣ Loading" },
    );

    if (!resp.data.schema) {
      ux.error(new ApiError(formatErrorRespMessage(resp)));
    }

    await Schema.writeSchemaFileFromData(schemaFileCtx, resp.data.schema);

    const action = schemaFileCtx.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} schema file at ${schemaFileCtx.abspath} using ${scope}`,
    );
  }

  async pullAllSchemas(): Promise<void> {
    const { flags } = this.props;
    const schemasDirCtx = await this.getSchemasDirContext();

    const prompt = schemasDirCtx.exists
      ? `Pull latest schemas into ${schemasDirCtx.abspath}?\n  This will overwrite matching schema files in this directory.`
      : `Create a new schemas directory at ${schemasDirCtx.abspath}?`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    const resp = await withSpinner<ListSchemaResp>(
      () => this.apiV1.listSchemas(this.props),
      {
        action: "‣ Loading",
      },
    );

    const schemas = resp.data.entries ?? [];
    await Schema.writeSchemasIndexDir(schemasDirCtx.abspath, schemas);

    const action = schemasDirCtx.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} ${schemas.length} schema file(s) at ${schemasDirCtx.abspath} using ${scope}`,
    );
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
