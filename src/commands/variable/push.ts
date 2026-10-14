import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import {
  applySecretWrite,
  BRANCH_ERROR,
  describePushEntry,
  entryToRequest,
  isPresent,
  readVariablesFile,
  resolveVariablesFile,
  toFileEntry,
  upsertEntry,
  validateVariablesFile,
  VariableEntry,
  VariablesFile,
  writeVariablesFile,
} from "@/lib/marshal/variable";

export default class VariablePush extends BaseCommand<typeof VariablePush> {
  static summary = "Push variables from variables.json to Knock.";

  static flags = {
    environment: Flags.string({
      summary: "Rejected. Push writes the project catalog in variables.json.",
    }),
    branch: Flags.string({
      summary: "Rejected. Variables are not branch-scoped.",
    }),
    "knock-dir": CustomFlags.dirPath({
      summary: "Knock directory used to locate variables.json.",
      required: false,
    }),
    force: Flags.boolean({
      summary: "Skip the confirmation prompt.",
    }),
  };

  static args = {
    key: Args.string({
      required: false,
      description: "Push only this entry. Omit to push every entry.",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;
    if (flags.branch) this.error(BRANCH_ERROR);
    if (flags.environment) {
      this.error(
        "knock variable push does not take --environment. Push updates the project catalog from variables.json.",
      );
    }

    const target = await resolveVariablesFile(
      this.projectConfig,
      flags["knock-dir"],
      this.runContext.cwd,
    );

    let file: VariablesFile;
    try {
      file = await readVariablesFile(target.abspath);
    } catch (error) {
      this.error((error as Error).message);
    }

    const keys = args.key ? [args.key] : Object.keys(file);
    if (args.key && !(args.key in file)) {
      this.error(`\`${args.key}\` is not in ${target.abspath}.`);
    }

    if (keys.length === 0) this.error(`No variables in ${target.abspath}.`);

    const errors = validateVariablesFile(
      Object.fromEntries(keys.map((key) => [key, file[key]])),
    );
    if (errors.length > 0) this.error(errors.join("\n"));

    const remoteTypes = await this.lookup(keys, file);
    for (const key of keys) {
      if (
        remoteTypes.get(key) === null &&
        typeof file[key].value !== "string"
      ) {
        this.error("A value is required to create a variable.");
      }
    }

    if (!flags.force) {
      const lines = keys
        .map(
          (key) =>
            `  ${key.padEnd(16)} ${file[key].type.padEnd(
              8,
            )} ${describePushEntry(file[key])}`,
        )
        .join("\n");
      const confirmed = await promptToConfirm(
        `Push ${keys.length} variable${keys.length === 1 ? "" : "s"} from ${
          target.abspath
        }?\n\n${lines}\n\nThis will not delete remote variables that are missing from the file.`,
      );
      if (!confirmed) return;
    }

    spinner.start("‣ Pushing");
    const pushed: string[] = [];

    for (const key of keys) {
      const entry = file[key];
      const body = entryToRequest(entry);
      // Preflight responses can include an obfuscated secret. The body comes
      // only from the local entry, so that string is never sent back.
      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.upsertVariable(key, body);
      if (!isSuccessResp(resp)) {
        spinner.stop();
        this.error(new ApiError(formatErrorRespMessage(resp)));
      }

      const nextEntry =
        entry.type === "secret"
          ? secretEntryFromRemote(entry, body, remoteTypes.get(key) ?? null)
          : toFileEntry(resp.data);
      file = upsertEntry(file, key, nextEntry);
      // eslint-disable-next-line no-await-in-loop
      await writeVariablesFile(target.abspath, file);
      pushed.push(key);
    }

    spinner.stop();
    this.log(
      `‣ Successfully pushed ${pushed.length} variable(s) from ${target.abspath}:\n` +
        indentString(pushed.join("\n"), 4),
    );
  }

  private async lookup(
    keys: string[],
    file: VariablesFile,
  ): Promise<Map<string, RemotePresence | null>> {
    const found = new Map<string, RemotePresence | null>();

    for (const key of keys) {
      // eslint-disable-next-line no-await-in-loop
      const resp = await this.apiV1.getVariable(key);
      if (resp.status === 404) {
        found.set(key, null);
        continue;
      }

      if (!isSuccessResp(resp)) {
        this.error(new ApiError(formatErrorRespMessage(resp)));
      }

      if (file[key].type !== resp.data.type) {
        this.error(
          `Cannot change ${key} from ${resp.data.type} to ${file[key].type}. Variable type cannot be changed after it is created.`,
        );
      }

      found.set(key, {
        type: resp.data.type,
        valueSet: isPresent(resp.data.value),
        environmentValuesSet: Object.fromEntries(
          Object.entries(resp.data.environment_values ?? {}).map(
            ([slug, value]) => [slug, isPresent(value)],
          ),
        ),
      });
    }

    return found;
  }
}

type RemotePresence = {
  type: VariableEntry["type"];
  valueSet: boolean;
  environmentValuesSet: Record<string, boolean>;
};

const secretEntryFromRemote = (
  entry: VariableEntry,
  body: ReturnType<typeof entryToRequest>,
  remote: RemotePresence | null,
): VariableEntry => {
  const presence = applySecretWrite(
    {
      value_set: remote?.valueSet ?? false,
      environment_values_set: remote?.environmentValuesSet ?? {},
    },
    body,
  );
  const next: VariableEntry = { type: "secret", value_set: presence.value_set };

  if (body.description !== undefined) next.description = body.description;
  else if (entry.description !== undefined)
    next.description = entry.description;

  if (Object.keys(presence.environment_values_set).length > 0) {
    next.environment_values_set = presence.environment_values_set;
  }

  return next;
};
