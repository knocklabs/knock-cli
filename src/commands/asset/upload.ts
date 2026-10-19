import { Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { withSpinner } from "@/lib/helpers/request";

// Spec: AssetUploadRequest.mime_type is one of these values.
const ASSET_MIME_TYPES = ["image/jpeg", "image/png", "image/gif"] as const;

// Spec: AssetUploadRequest.content_length maximum is 5_000_000, minimum is 1.
const MAX_ASSET_BYTES = 5_000_000;

export default class AssetUpload extends BaseCommand<typeof AssetUpload> {
  static summary = "Request a time-limited URL to upload an asset file.";

  static description = `
Requests a signed URL for a direct upload. This command does not send the file
bytes. PUT the file to the returned URL with the same Content-Type and
Content-Length, then record it with \`knock asset create\`.

Assets are account-wide. This command does not take an environment or branch.
`;

  static enableJsonFlag = true;

  static flags = {
    "mime-type": Flags.string({
      required: true,
      options: [...ASSET_MIME_TYPES],
      summary:
        "The MIME type of the file. One of image/jpeg, image/png, or image/gif.",
    }),
    "content-length": Flags.integer({
      required: true,
      min: 1,
      max: MAX_ASSET_BYTES,
      summary:
        "The file size in bytes. Maximum is 5000000. The upload URL is signed for this length.",
    }),
    filename: Flags.string({
      summary:
        "The display name to echo back. The upload request does not store it. Send it again when creating the asset.",
    }),
  };

  async run(): Promise<ApiV1.AssetUpload | void> {
    const flags = this.props.flags;
    const filename = flags.filename;

    if (filename !== undefined && filename.trim().length === 0) {
      this.error("Asset filename cannot be blank.");
    }

    const resp = await withSpinner<ApiV1.AssetUpload>(
      () =>
        this.apiV1.requestAssetUpload({
          mime_type: flags["mime-type"],
          content_length: flags["content-length"],
          filename,
        }),
      { action: "‣ Requesting asset upload" },
    );

    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  render(upload: ApiV1.AssetUpload): void {
    const label = upload.filename ? ` for \`${upload.filename}\`` : "";

    this.log(`‣ Requested an asset upload${label}.`);
    this.log(
      "  PUT the file bytes to the upload URL. The signature covers Content-Type and Content-Length, and the PUT must send both.",
    );
    this.log(`  Content-Type: ${upload.mime_type}`);
    this.log(`  Content-Length: ${upload.content_length}`);
    this.log(`  Expires in: ${upload.expires_in} seconds`);
    this.log(`  Key: ${upload.key}`);
    this.log(`  Upload URL: ${upload.upload_url}`);
  }
}
