import { Args, Flags } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import { BRANCH_ERROR, validateVariableKey } from "@/lib/marshal/variable";

type DeleteResult = {
  key: string;
  deleted?: true;
  environment?: string;
  override_cleared?: true;
};

export default class VariableDelete extends BaseCommand<typeof VariableDelete> {
  static summary = "Delete a variable, or clear one environment override.";

  static flags = {
    environment: Flags.string({
      summary:
        "Clear only this environment's override. The variable itself is not deleted.",
    }),
    branch: Flags.string({
      summary: "Rejected. Variables are not branch-scoped.",
    }),
    force: Flags.boolean({
      summary: "Skip the confirmation prompt.",
    }),
  };

  static args = {
    key: Args.string({
      required: true,
      description: "The variable key.",
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<DeleteResult | void> {
    const { args, flags } = this.props;
    if (flags.branch) this.error(BRANCH_ERROR);

    const keyError = validateVariableKey(args.key);
    if (keyError) this.error(keyError);

    if (!flags.force) {
      const prompt = flags.environment
        ? `Clear the \`${flags.environment}\` override for \`${args.key}\`? The default value will apply in ${flags.environment}. The variable will not be deleted.`
        : `Delete variable \`${args.key}\` and every environment override? This cannot be undone.`;
      const confirmed = await promptToConfirm(prompt);
      if (!confirmed) return;
    }

    spinner.start("‣ Deleting");
    const resp = await this.apiV1.deleteVariable(args.key, flags.environment);
    spinner.stop();

    if (!isSuccessResp(resp)) {
      this.error(new ApiError(formatErrorRespMessage(resp)));
    }

    const result: DeleteResult = flags.environment
      ? {
          key: args.key,
          environment: flags.environment,
          override_cleared: true,
        }
      : { key: args.key, deleted: true };

    if (flags.json) return result;

    if (flags.environment) {
      this.log(
        `‣ Cleared the \`${flags.environment}\` override for \`${args.key}\`. The default value now applies there.`,
      );
    } else {
      this.log(
        `‣ Deleted variable \`${args.key}\` and all of its environment overrides.`,
      );
    }
  }
}
