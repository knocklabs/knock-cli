import * as path from "node:path";

import { Args, Flags } from "@oclif/core";
import * as fs from "fs-extra";

import {
  type Asset,
  ASSET_MIME_TYPES,
  type AssetMimeType,
  byteLengthError,
  MAX_ASSET_BYTES,
  resolveAssetMimeType,
} from "@/lib/assets";
import BaseCommand from "@/lib/base-command";
import { formatDate } from "@/lib/helpers/date";
import { spinner } from "@/lib/helpers/ux";

export default class AssetCp extends BaseCommand<typeof AssetCp> {
  static summary = "Copy a file into the account as an asset.";

  static description = `
Reads a file, uploads the bytes, and records the asset.

Pass - to read the file from stdin. Stdin requires --filename.

Assets are account-wide. This command does not take an environment or branch.
`;

  static enableJsonFlag = true;

  static args = {
    file: Args.string({
      required: true,
      description: "Path to the file to copy, or - to read stdin.",
    }),
  };

  static flags = {
    filename: Flags.string({
      summary:
        "Display name for the asset. Defaults to the file's basename. Required when reading stdin.",
    }),
    "mime-type": Flags.string({
      options: [...ASSET_MIME_TYPES],
      summary:
        "MIME type override. One of image/jpeg, image/png, or image/gif.",
    }),
  };

  async run(): Promise<Asset | void> {
    const source = this.props.args.file;
    const { filename: filenameFlag, json } = this.props.flags;
    const filename = this.displayName(source, filenameFlag);
    const bytes = await this.readBytes(source);
    const mimeType = this.mimeType(source, bytes);

    spinner.start(`‣ Copying \`${filename}\``);

    const asset = await this.apiV1.copyAsset({ bytes, filename, mimeType });

    // Stop only after success. A failure leaves the spinner running so the
    // command error handler can mark it failed instead of done.
    spinner.stop();

    if (json) return asset;
    this.render(asset, filename);
  }

  private displayName(source: string, filenameFlag?: string): string {
    if (filenameFlag !== undefined) {
      if (filenameFlag.trim().length === 0) {
        this.error("Asset filename cannot be blank.");
      }

      return filenameFlag;
    }

    if (source === "-") {
      this.error("Pass --filename when copying from stdin.");
    }

    return path.basename(source);
  }

  private async readBytes(source: string): Promise<Buffer> {
    if (source === "-") {
      return this.readStdin();
    }

    const absolutePath = path.resolve(source);
    let stat: fs.Stats;

    try {
      stat = await fs.stat(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.error(`No such file \`${source}\`.`);
      }

      throw error;
    }

    if (!stat.isFile()) {
      this.error(`\`${source}\` is not a file.`);
    }

    const lengthError = byteLengthError(stat.size);
    if (lengthError) this.error(lengthError);

    return fs.readFile(absolutePath);
  }

  private async readStdin(): Promise<Buffer> {
    if (process.stdin.isTTY) {
      this.error("No file on stdin. Pipe a file, or pass a path.");
    }

    const chunks: Buffer[] = [];
    let total = 0;

    for await (const chunk of process.stdin) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > MAX_ASSET_BYTES) {
        this.error(
          `The file is ${total} bytes. The maximum is ${MAX_ASSET_BYTES} bytes.`,
        );
      }

      chunks.push(buf);
    }

    const bytes = Buffer.concat(chunks, total);
    const lengthError = byteLengthError(bytes.length);
    if (lengthError) this.error(lengthError);

    return bytes;
  }

  private mimeType(source: string, bytes: Buffer): AssetMimeType {
    const resolved = resolveAssetMimeType({
      bytes,
      override: this.props.flags["mime-type"] as AssetMimeType | undefined,
      sourcePath: source === "-" ? undefined : source,
    });

    if ("error" in resolved) {
      this.error(resolved.error);
    }

    return resolved.mimeType;
  }

  private render(asset: Asset, filename: string): void {
    const name = asset.filename ?? filename;

    this.log(`‣ Copied \`${name}\` (\`${asset.id}\`).`);
    this.log(`  URL: ${asset.url}`);
    this.log(`  MIME type: ${asset.mime_type}`);
    this.log(`  Type: ${asset.asset_type}`);
    this.log(`  Created at: ${formatDate(asset.created_at)}`);
  }
}
