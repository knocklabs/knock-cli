import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { KnockEnv } from "@/lib/helpers/const";
import * as CustomFlags from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";
import {
  ALL_RESOURCE_TYPES,
  ALLOW_EMPTY_RESOURCE_TYPES,
} from "@/lib/resources";

const ALLOW_EMPTY_RESOURCE_TYPE_SET = new Set<string>(
  ALLOW_EMPTY_RESOURCE_TYPES,
);

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
    "allow-empty": CustomFlags.allowEmpty,
    "resource-type": Flags.string({
      summary:
        "Commit only changes for the given resource type. Can be used alone or together with --resource-id.",
      options: ALL_RESOURCE_TYPES,
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

    if (flags["allow-empty"]) {
      if (!flags["resource-type"] || !flags["resource-id"]) {
        this.error(
          "The --allow-empty flag must be used with a single --resource-type and --resource-id.",
        );
      }

      if (!ALLOW_EMPTY_RESOURCE_TYPE_SET.has(flags["resource-type"])) {
        this.error(
          "Empty commits for `audience` are not yet supported. Other supported resource types: " +
            ALLOW_EMPTY_RESOURCE_TYPES.join(", "),
        );
      }
    }

    const scope = formatCommandScope(flags);
    const qualifier = this.formatResourceQualifier(flags);

    const prompt = flags["allow-empty"]
      ? `Create empty commit for ${qualifier} in the ${scope}?`
      : qualifier
      ? `Commit ${qualifier} in the ${scope}?`
      : `Commit all changes in the ${scope}?`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    await withSpinner<ApiV1.CommitAllChangesResp>(() =>
      this.apiV1.commitAllChanges(this.props),
    );

    const successMsg = flags["allow-empty"]
      ? `‣ Successfully created empty commit for ${qualifier} in ${scope}`
      : qualifier
      ? `‣ Successfully committed ${qualifier} in ${scope}`
      : `‣ Successfully committed all changes in ${scope}`;
    this.log(successMsg);
  }

  private formatResourceQualifier(flags: {
    "resource-type"?: string;
    "resource-id"?: string;
  }): string | null {
    if (flags["resource-type"] && flags["resource-id"]) {
      return `\`${flags["resource-type"]}\` \`${flags["resource-id"]}\``;
    }

    if (flags["resource-type"]) {
      return `all \`${flags["resource-type"]}\` changes`;
    }

    return null;
  }
}
