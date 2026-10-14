import { Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import * as CustomFlags from "@/lib/helpers/flag";
import { promptToConfirm } from "@/lib/helpers/ux";
import {
  BRANCH_ERROR,
  isVariableType,
  readVariablesFile,
  resolveVariablesFile,
  upsertEntry,
  validateVariableKey,
  VariableEntry,
  writeVariablesFile,
} from "@/lib/marshal/variable";

import VariablePush from "./push";

export default class VariableNew extends BaseCommand<typeof VariableNew> {
  static summary = "Add a variable entry to variables.json.";

  static flags = {
    key: Flags.string({
      summary: "Variable key.",
      required: true,
    }),
    type: Flags.string({
      summary: "public or secret.",
      options: ["public", "secret"],
      required: true,
    }),
    value: Flags.string({
      summary: "Default value. Public variables only.",
    }),
    description: Flags.string({
      summary: "Variable description.",
    }),
    "knock-dir": CustomFlags.dirPath({
      summary: "Knock directory used to locate variables.json.",
      required: false,
    }),
    force: Flags.boolean({
      summary: "Skip the confirmation prompt when creating the file.",
    }),
    push: Flags.boolean({
      summary: "Push the new entry after writing it.",
      default: false,
    }),
    branch: Flags.string({
      summary: "Rejected. Variables are not branch-scoped.",
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;
    if (flags.branch) this.error(BRANCH_ERROR);

    const key = flags.key!;
    const keyError = validateVariableKey(key);
    if (keyError) this.error(keyError);
    if (!isVariableType(flags.type!)) {
      this.error("type must be public or secret.");
    }

    if (flags.type === "secret" && flags.value !== undefined) {
      this.error(
        "Refusing to write a secret with --value. Use knock variable set --value-stdin, or edit the entry and push it.",
      );
    }

    const target = await resolveVariablesFile(
      this.projectConfig,
      flags["knock-dir"],
      this.runContext.cwd,
    );

    let current: Awaited<ReturnType<typeof readVariablesFile>> = {};
    if (target.exists) {
      try {
        current = await readVariablesFile(target.abspath);
      } catch (error) {
        this.error((error as Error).message);
      }
    }

    if (key in current) {
      this.error(`\`${key}\` is already in ${target.abspath}.`);
    }

    if (!target.exists && !flags.force) {
      const confirmed = await promptToConfirm(
        `Create a variables file at ${target.abspath}?`,
      );
      if (!confirmed) return;
    }

    const entry: VariableEntry = { type: flags.type };
    if (flags.description !== undefined) entry.description = flags.description;
    if (flags.type === "public") entry.value = flags.value ?? null;
    if (flags.type === "secret") entry.value_set = false;

    await writeVariablesFile(target.abspath, upsertEntry(current, key, entry));
    this.log(`‣ Added \`${key}\` to ${target.abspath}`);

    if (!flags.push) return;

    const pushArgs = [
      key,
      ...(flags["knock-dir"]
        ? ["--knock-dir", flags["knock-dir"].abspath]
        : []),
      ...(flags["service-token"]
        ? ["--service-token", flags["service-token"]]
        : []),
      ...(flags["api-origin"] ? ["--api-origin", flags["api-origin"]] : []),
    ];

    await VariablePush.run(pushArgs);
  }
}
