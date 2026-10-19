import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import { withSpinner } from "@/lib/helpers/request";

export default class AssetCreate extends BaseCommand<typeof AssetCreate> {
  static summary = "Create an asset from an uploaded file key.";

  static description = `
Records a library asset for a storage key returned by \`knock asset upload\`.
The file must already be uploaded.

Assets are account-wide. This command does not take an environment or branch.
`;

  static enableJsonFlag = true;

  static flags = {
    key: Flags.string({
      required: true,
      summary:
        "The storage key from the upload request. The file must already be uploaded.",
    }),
    filename: Flags.string({
      required: true,
      summary: "The display name for this asset.",
    }),
  };

  async run(): Promise<ApiV1.Asset | void> {
    const { key, filename, json } = this.props.flags;

    if (key.trim().length === 0) {
      this.error("Asset key is required.");
    }

    if (filename.trim().length === 0) {
      this.error("Asset filename is required.");
    }

    const resp = await withSpinner<ApiV1.Asset>(
      () => this.apiV1.createAsset({ key, filename }),
      { action: `‣ Creating asset \`${filename}\`` },
    );

    if (json) return resp.data;

    this.render(resp.data);
  }

  render(asset: ApiV1.Asset): void {
    const name = asset.filename ?? this.props.flags.filename;

    this.log(`‣ Successfully created asset \`${name}\` (\`${asset.id}\`).`);
    this.log(`  URL: ${asset.url}`);
    this.log(`  MIME type: ${asset.mime_type}`);
    this.log(`  Type: ${asset.asset_type}`);
    this.log(`  Created at: ${formatDate(asset.created_at)}`);
  }
}
