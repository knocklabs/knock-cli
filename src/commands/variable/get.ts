import { Args, Flags, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatDateTime } from "@/lib/helpers/date";
import { ApiError } from "@/lib/helpers/error";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { spinner } from "@/lib/helpers/ux";
import {
  BRANCH_ERROR,
  displayValue,
  formatRedactedDefault,
  RedactedVariable,
  redactVariable,
  validateVariableKey,
} from "@/lib/marshal/variable";

export default class VariableGet extends BaseCommand<typeof VariableGet> {
  static summary = "Display a variable and its environment overrides.";

  static flags = {
    environment: Flags.string({
      summary:
        "Rejected. Get always shows the default and every environment override.",
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
    const { flags, args } = this.props;
    if (flags.branch) this.error(BRANCH_ERROR);
    if (flags.environment) {
      this.error(
        "knock variable get does not take --environment. It always shows the default and every override.",
      );
    }

    const keyError = validateVariableKey(args.key);
    if (keyError) this.error(keyError);

    spinner.start("‣ Loading");
    const resp = await this.apiV1.getVariable(args.key);
    spinner.stop();

    if (!isSuccessResp(resp)) {
      this.error(new ApiError(formatErrorRespMessage(resp)));
    }

    const redacted = redactVariable(resp.data);
    if (flags.json) return redacted;

    this.render(redacted);
  }

  render(variable: RedactedVariable): void {
    this.log(`‣ Showing variable \`${variable.key}\`\n`);

    const rows = [
      { key: "Key", value: variable.key },
      { key: "Type", value: variable.type },
      { key: "Description", value: variable.description || "-" },
      { key: "Default", value: formatRedactedDefault(variable) },
      { key: "Created at", value: formatDateTime(variable.inserted_at) },
      { key: "Updated at", value: formatDateTime(variable.updated_at) },
    ];

    ux.table(rows, {
      key: { header: "Variable", minWidth: 16 },
      value: { header: "", minWidth: 24 },
    });

    const overrides =
      variable.type === "secret"
        ? Object.entries(variable.environment_values_set ?? {}).map(
            ([slug, set]) => ({
              environment: slug,
              value: set ? "set" : "unset",
            }),
          )
        : Object.entries(variable.environment_values ?? {}).map(
            ([slug, value]) => ({
              environment: slug,
              value: displayValue("public", value, "override"),
            }),
          );

    if (overrides.length === 0) return;

    this.log("");
    ux.table(overrides, {
      environment: { header: "Environment" },
      value: { header: "Value" },
    });
  }
}
