import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import {
  BRANCH_ERROR,
  describePushEntry,
  entryToRequest,
  readVariablesFile,
  resolveVariablesFile,
  secretEntryAfterPush,
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
    "variables-file": CustomFlags.filePath({
      summary:
        "Path to variables.json. Defaults to <knock dir>/variables.json.",
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
      flags["variables-file"],
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
          ? secretEntryAfterPush(entry, body)
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
  ): Promise<Map<string, VariableEntry["type"] | null>> {
    const found = new Map<string, VariableEntry["type"] | null>();

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

      found.set(key, resp.data.type);
    }

    return found;
  }
}
