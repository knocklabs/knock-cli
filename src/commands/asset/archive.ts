import { Args, Flags } from "@oclif/core";

import { type ArchiveAssetResp } from "@/lib/assets";
import BaseCommand from "@/lib/base-command";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

// Spec: asset_id is a UUID. Accept any RFC variant, including the v7 ids Knock returns.
const ASSET_ID_PATTERN = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

export default class AssetArchive extends BaseCommand<typeof AssetArchive> {
  static summary = "Archive an asset.";

  static description = `
Archives an asset for the account.

Assets are account-wide. This command does not take an environment or branch.
`;

  static enableJsonFlag = true;

  static flags = {
    force: Flags.boolean({
      summary: "Skip confirmation prompt.",
    }),
  };

  static args = {
    assetId: Args.string({
      required: true,
      description: "The id of the asset to archive.",
    }),
  };

  async run(): Promise<ArchiveAssetResp | void> {
    const { assetId } = this.props.args;
    const { force, json } = this.props.flags;

    if (!ASSET_ID_PATTERN.test(assetId)) {
      this.error(`Asset id \`${assetId}\` must be a UUID.`);
    }

    // --json cannot answer a confirmation prompt.
    if (json && !force) {
      this.error("Pass --force to archive an asset when using --json.");
    }

    if (!force) {
      const confirmed = await promptToConfirm(
        `WARNING: Archiving asset \`${assetId}\` applies to the whole account.\n` +
          `Continue?`,
      );
      if (!confirmed) {
        this.log("Archive cancelled.");
        return;
      }
    }

    const resp = await withSpinner<ArchiveAssetResp>(
      () => this.apiV1.archiveAsset(assetId),
      { action: `‣ Archiving asset \`${assetId}\`` },
    );

    if (json) return resp.data;

    this.log(`‣ Successfully archived asset \`${assetId}\`.`);
  }
}
