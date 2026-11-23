import { Args, Flags } from "@oclif/core";
import * as fs from "fs-extra";

import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";
import {
  applySecretWrite,
  BRANCH_ERROR,
  describeSet,
  isPresent,
  RedactedVariable,
  redactVariable,
  validateVariableKey,
  Variable,
  VariableRequest,
  VariableType,
} from "@/lib/marshal/variable";

const SECRET_ARGV_ERROR =
  "Refusing to read a secret from the command line. Use --value-stdin or --value-file.";

export const stdinValuePrompt = (key: string): string =>
  `Enter a value for \`${key}\`. End with Ctrl-D.\n`;

export default class VariableSet extends BaseCommand<typeof VariableSet> {
  static summary = "Create or update a variable.";

  static flags = {
    type: Flags.string({
      summary: "public or secret. Required when creating a variable.",
      options: ["public", "secret"],
    }),
    value: Flags.string({
      summary: "Default value. Public variables only.",
    }),
    "value-file": Flags.string({
      summary: "Read the default value from a file. The bytes are not trimmed.",
    }),
    "value-stdin": Flags.boolean({
      summary:
        "Read the default value from stdin until EOF. The bytes are not trimmed. This is the default when no value flag is passed; a terminal prints a prompt on stderr first.",
    }),
    "unset-value": Flags.boolean({
      summary: "Clear the default value.",
    }),
    description: Flags.string({
      summary: "Variable description.",
    }),
    "unset-description": Flags.boolean({
      summary: "Clear the description.",
    }),
    "environment-value": Flags.string({
      summary:
        "Set one environment override as <slug>=<value>. Repeatable. Public variables only.",
      multiple: true,
    }),
    "environment-value-file": Flags.string({
      summary:
        "Set one environment override from a file as <slug>=<path>. Repeatable.",
      multiple: true,
    }),
    "unset-environment": Flags.string({
      summary: "Clear one environment override. Repeatable.",
      multiple: true,
    }),
    environment: Flags.string({
      summary:
        "Rejected. Use --environment-value, --environment-value-file, or --unset-environment.",
    }),
    branch: Flags.string({
      summary: "Rejected. Variables are not branch-scoped.",
    }),
  };

  static args = {
    key: Args.string({
      required: true,
      description: "The variable key.",
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<RedactedVariable | void> {
    const { args, flags } = this.props;
    if (flags.branch) this.error(BRANCH_ERROR);
    if (flags.environment) {
      this.error(
        "--environment is not a scope flag on set. Use --environment-value, --environment-value-file, or --unset-environment.",
      );
    }

    const keyError = validateVariableKey(args.key);
    if (keyError) this.error(keyError);

    const valueSources = [
      flags.value !== undefined,
      flags["value-file"] !== undefined,
      flags["value-stdin"],
      flags["unset-value"],
    ].filter(Boolean);
    if (valueSources.length > 1) {
      this.error(
        "Pass only one of --value, --value-file, --value-stdin, or --unset-value.",
      );
    }

    spinner.start("‣ Loading");
    const existing = await this.apiV1.getVariable(args.key);
    spinner.stop();

    let remote: Variable | undefined;
    if (existing.status === 404) {
      remote = undefined;
    } else if (isSuccessResp(existing)) {
      remote = existing.data;
    } else {
      this.error(new ApiError(formatErrorRespMessage(existing)));
    }

    const type = this.resolveType(
      remote,
      flags.type as VariableType | undefined,
    );
    this.rejectSecretArgv(type, flags.value, flags["environment-value"]);

    const environmentValues = await this.environmentValues();
    const value = await this.resolveValue(valueSources.length);

    if (!remote && value === undefined) {
      this.error("A value is required to create a variable.");
    }

    const body: VariableRequest = { type };
    if (value !== undefined) body.value = value;
    if (flags["unset-description"]) body.description = "";
    else if (flags.description !== undefined)
      body.description = flags.description;
    if (Object.keys(environmentValues).length > 0) {
      body.environment_values = environmentValues;
    }

    spinner.start("‣ Saving");
    const saved = await this.apiV1.upsertVariable(args.key, body);
    spinner.stop();

    if (!isSuccessResp(saved)) {
      this.error(new ApiError(formatErrorRespMessage(saved)));
    }

    const redacted = this.redactedResult(saved.data, remote, body);
    if (flags.json) return redacted;

    const detail = describeSet(type, body);
    const suffix = detail ? ` (${detail})` : "";
    this.log(`‣ Set ${type} variable \`${args.key}\`${suffix}.`);
  }

  private async resolveValue(
    valueSourceCount: number,
  ): Promise<string | undefined> {
    const { flags } = this.props;
    if (flags["unset-value"]) return "";
    if (flags.value !== undefined) return flags.value;
    if (flags["value-file"]) {
      return fs.readFile(flags["value-file"], "utf8");
    }

    if (flags["value-stdin"] || valueSourceCount === 0) {
      return this.readStdinValue(valueSourceCount === 0);
    }

    return undefined;
  }

  private readStdinValue(promptOnTerminal: boolean): string {
    if (promptOnTerminal && process.stdin.isTTY) {
      process.stderr.write(stdinValuePrompt(this.props.args.key));
    }

    return fs.readFileSync(0, "utf8");
  }

  private resolveType(
    remote: Variable | undefined,
    requested: VariableType | undefined,
  ): VariableType {
    if (!remote) {
      if (!requested) this.error("type is required to create a variable.");
      return requested;
    }

    if (requested && requested !== remote.type) {
      this.error(
        `Cannot change ${remote.key} from ${remote.type} to ${requested}. Variable type cannot be changed after it is created.`,
      );
    }

    return remote.type;
  }

  private rejectSecretArgv(
    type: VariableType,
    value: string | undefined,
    environmentValues: string[] | undefined,
  ): void {
    if (type !== "secret") return;
    if (
      value !== undefined ||
      (environmentValues && environmentValues.length > 0)
    ) {
      this.error(SECRET_ARGV_ERROR);
    }
  }

  private async environmentValues(): Promise<Record<string, string>> {
    const { flags } = this.props;
    const values: Record<string, string> = {};
    const seen = new Set<string>();

    const claim = (slug: string): void => {
      if (!slug) this.error("An environment slug is required.");
      if (seen.has(slug)) {
        this.error(`Environment \`${slug}\` was provided more than once.`);
      }

      seen.add(slug);
    };

    for (const input of asList(flags["unset-environment"])) {
      claim(input);
      values[input] = "";
    }

    for (const input of asList(flags["environment-value"])) {
      const parsed = this.splitSlugValue(input);
      claim(parsed.slug);
      values[parsed.slug] = parsed.rest;
    }

    const fileOverrides = await Promise.all(
      asList(flags["environment-value-file"]).map(async (input) => {
        const parsed = this.splitSlugValue(input);
        return {
          slug: parsed.slug,
          contents: await fs.readFile(parsed.rest, "utf8"),
        };
      }),
    );
    for (const override of fileOverrides) {
      claim(override.slug);
      values[override.slug] = override.contents;
    }

    return values;
  }

  private splitSlugValue(input: string): { slug: string; rest: string } {
    const index = input.indexOf("=");
    if (index <= 0) {
      this.error(`Expected <slug>=<value>, got \`${input}\`.`);
    }

    return { slug: input.slice(0, index), rest: input.slice(index + 1) };
  }

  private redactedResult(
    saved: Variable,
    remote: Variable | undefined,
    body: VariableRequest,
  ): RedactedVariable {
    if (body.type === "public") return redactVariable(saved);

    const presence = applySecretWrite(
      {
        value_set: remote ? isPresent(remote.value) : false,
        environment_values_set: Object.fromEntries(
          Object.entries(remote?.environment_values ?? {}).map(
            ([slug, value]) => [slug, isPresent(value)],
          ),
        ),
      },
      body,
    );

    const environmentValues: Record<string, null> = {};
    for (const slug of Object.keys(presence.environment_values_set)) {
      environmentValues[slug] = null;
    }

    return {
      key: saved.key,
      type: "secret",
      description:
        body.description === undefined ? saved.description : body.description,
      inserted_at: saved.inserted_at,
      updated_at: saved.updated_at,
      value: null,
      value_set: presence.value_set,
      ...(Object.keys(presence.environment_values_set).length > 0
        ? {
            environment_values: environmentValues,
            environment_values_set: presence.environment_values_set,
          }
        : {}),
    };
  }
}

const asList = (value: string | string[] | undefined): string[] => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};
