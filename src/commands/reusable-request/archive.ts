import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import * as CustomFlags from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class ReusableRequestArchive extends BaseCommand<
  typeof ReusableRequestArchive
> {
  static summary = "Archive a reusable request (affects ALL environments).";

  static description = `
WARNING: Archiving a reusable request affects ALL environments and cannot be undone.
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
    reusableRequestKey: Args.string({
      required: true,
      description: "The key of the reusable request to archive.",
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.ArchiveReusableRequestResp | void> {
    const { reusableRequestKey } = this.props.args;
    const { force, json } = this.props.flags;

    if (!force) {
      const confirmed = await promptToConfirm(
        `WARNING: Archiving reusable request \`${reusableRequestKey}\` will affect ALL environments.\n` +
          `This action cannot be undone. Continue?`,
      );
      if (!confirmed) {
        this.log("Archive cancelled.");
        return;
      }
    }

    const resp = await withSpinner<ApiV1.ArchiveReusableRequestResp>(
      () => this.apiV1.archiveReusableRequest(this.props),
      { action: `‣ Archiving reusable request \`${reusableRequestKey}\`` },
    );

    if (json) return resp.data;

    this.log(
      `‣ Successfully archived reusable request \`${reusableRequestKey}\` across all environments.`,
    );
  }
}
