import { Args, Flags, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { formatErrorRespMessage, isSuccessResp } from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";

export default class AudienceArchive extends BaseCommand<
  typeof AudienceArchive
> {
  static summary = "Archive an audience (affects ALL environments).";

  static description = `
WARNING: Archiving an audience affects ALL environments and cannot be undone.
Use this command with caution.
`;

  static flags = {
    environment: Flags.string({
      required: true,
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    force: Flags.boolean({
      summary: "Skip confirmation prompt.",
    }),
  };

  static args = {
    audienceKey: Args.string({
      required: true,
      description: "The key of the audience to archive.",
    }),
  };

  async run(): Promise<void> {
    const { audienceKey } = this.props.args;
    const { force } = this.props.flags;

    // Confirm before archiving since this affects all environments
    if (!force) {
      const confirmed = await promptToConfirm(
        `WARNING: Archiving audience \`${audienceKey}\` will affect ALL environments.\n` +
          `This action cannot be undone. Continue?`,
      );
      if (!confirmed) {
        this.log("Archive cancelled.");
        return;
      }
    }

    spinner.start(`‣ Archiving audience \`${audienceKey}\``);

    const resp = await this.apiV1.archiveAudience(this.props);

    spinner.stop();

    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      ux.error(new ApiError(message));
    }

    this.log(
      `‣ Successfully archived audience \`${audienceKey}\` across all environments.`,
    );
  }
}
