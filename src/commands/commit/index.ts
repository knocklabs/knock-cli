import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { KnockEnv } from "@/lib/helpers/const";
import * as CustomFlags from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class Commit extends BaseCommand<typeof Commit> {
  static summary =
    "Commit all changes in development environment, or only changes for a specific resource type.";

  static flags = {
    environment: Flags.string({
      summary:
        "Committing changes applies to the development environment only, use `commit promote` to promote changes to a subsequent environment.",
      default: KnockEnv.Development,
      options: [KnockEnv.Development],
    }),
    branch: CustomFlags.branch,
    "commit-message": Flags.string({
      summary: "Use the given value as the commit message.",
      char: "m",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
    "resource-type": Flags.string({
      summary:
        "Commit only changes for the given resource type. Can be used alone or together with --resource-id.",
      options: [
        "email_layout",
        "guide",
        "message_type",
        "partial",
        "translation",
        "workflow",
      ],
    }),
    "resource-id": Flags.string({
      summary:
        "Commit only changes for the given resource identifier. Must be used together with --resource-type.",
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.props;

    if (flags["resource-id"] && !flags["resource-type"]) {
      this.error(
        "The --resource-id flag must be used together with --resource-type.",
      );
    }

    const scope = formatCommandScope(flags);
    const qualifier = this.formatResourceQualifier(flags);

    const prompt = qualifier
      ? `Commit ${qualifier} in the ${scope}?`
      : `Commit all changes in the ${scope}?`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    await withSpinner<ApiV1.CommitAllChangesResp>(() =>
      this.apiV1.commitAllChanges(this.props),
    );

    const successMsg = qualifier
      ? `‣ Successfully committed ${qualifier} in ${scope}`
      : `‣ Successfully committed all changes in ${scope}`;
    this.log(successMsg);
  }

  private formatResourceQualifier(flags: {
    "resource-type"?: string;
    "resource-id"?: string;
  }): string | null {
    if (flags["resource-type"] && flags["resource-id"]) {
      return `\`${flags["resource-type"]}\` changes for \`${flags["resource-id"]}\``;
    }

    if (flags["resource-type"]) {
      return `all \`${flags["resource-type"]}\` changes`;
    }

    return null;
  }
}
