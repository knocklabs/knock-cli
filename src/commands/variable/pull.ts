import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { MAX_PAGINATION_LIMIT } from "@/lib/helpers/page";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import {
  BRANCH_ERROR,
  PULL_ENVIRONMENT_ERROR,
  readVariablesFile,
  removeEntry,
  resolveVariablesFile,
  toFileEntry,
  upsertEntry,
  validateVariableKey,
  Variable,
  VariablesFile,
  writeVariablesFile,
} from "@/lib/marshal/variable";

export default class VariablePull extends BaseCommand<typeof VariablePull> {
  static summary = "Pull variables into variables.json.";

  static flags = {
    environment: Flags.string({
      summary: "Rejected. Pull always fetches the project catalog.",
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
      description: "Update only this entry. Omit to pull every variable.",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;
    if (flags.branch) this.error(BRANCH_ERROR);
    if (flags.environment) this.error(PULL_ENVIRONMENT_ERROR);

    if (args.key) {
      const keyError = validateVariableKey(args.key);
      if (keyError) this.error(keyError);
      return this.pullOne(args.key);
    }

    return this.pullAll();
  }

  private async targetFile() {
    return resolveVariablesFile(
      this.projectConfig,
      this.props.flags["knock-dir"],
      this.runContext.cwd,
    );
  }

  private async pullAll(): Promise<void> {
    const target = await this.targetFile();
    const { flags } = this.props;

    if (!flags.force) {
      const prompt = target.exists
        ? `Pull latest variables into ${target.abspath}?\n  This replaces the file. Entries that no longer exist in Knock will be removed.`
        : `Create a variables file at ${target.abspath}?`;
      const confirmed = await promptToConfirm(prompt);
      if (!confirmed) return;
    }

    spinner.start("‣ Loading");
    const variables = await this.listAll();
    const previous = await this.readOrEmpty(target);
    spinner.stop();

    const next: VariablesFile = {};
    for (const variable of variables) {
      next[variable.key] = toFileEntry(variable);
    }

    const removed = Object.keys(previous).filter(
      (key) => !(key in next),
    ).length;
    await writeVariablesFile(target.abspath, next);

    const removedText = removed > 0 ? `, ${removed} removed` : "";
    this.log(
      `‣ Successfully updated ${target.abspath} (${variables.length} variables${removedText})`,
    );
  }

  private async pullOne(key: string): Promise<void> {
    const target = await this.targetFile();

    spinner.start("‣ Loading");
    const resp = await this.apiV1.getVariable(key);
    spinner.stop();

    const current = await this.readOrEmpty(target);

    if (resp.status === 404) {
      if (!(key in current)) {
        this.log(`‣ No entry for \`${key}\` in ${target.abspath}`);
        return;
      }

      if (!this.props.flags.force) {
        const confirmed = await promptToConfirm(
          `Remove \`${key}\` from ${target.abspath}?\n  It is not in Knock. A local value that has not been pushed will be deleted.`,
        );
        if (!confirmed) return;
      }

      await writeVariablesFile(target.abspath, removeEntry(current, key).file);
      this.log(`‣ Removed \`${key}\` from ${target.abspath}`);
      return;
    }

    if (!isSuccessResp(resp)) {
      this.error(new ApiError(formatErrorRespMessage(resp)));
    }

    await writeVariablesFile(
      target.abspath,
      upsertEntry(current, key, toFileEntry(resp.data)),
    );
    this.log(`‣ Successfully updated \`${key}\` in ${target.abspath}`);
  }

  private async readOrEmpty(target: {
    abspath: string;
    exists: boolean;
  }): Promise<VariablesFile> {
    if (!target.exists) return {};
    try {
      return await readVariablesFile(target.abspath);
    } catch (error) {
      this.error((error as Error).message);
    }
  }

  private async listAll(
    after?: string,
    fetched: Variable[] = [],
  ): Promise<Variable[]> {
    const resp = await this.apiV1.listVariables({
      after,
      limit: MAX_PAGINATION_LIMIT,
    });

    if (!isSuccessResp(resp)) {
      this.error(new ApiError(formatErrorRespMessage(resp)));
    }

    const entries = [...fetched, ...resp.data.entries];
    return resp.data.page_info.after
      ? this.listAll(resp.data.page_info.after, entries)
      : entries;
  }
}
