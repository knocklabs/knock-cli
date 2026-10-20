// Spec: AssetUploadRequest.mime_type is one of these values.
export const ASSET_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
] as const;

export type AssetMimeType = (typeof ASSET_MIME_TYPES)[number];

// Spec: AssetUploadRequest.content_length maximum is 5_000_000, minimum is 1.
export const MAX_ASSET_BYTES = 5_000_000;

const MIME_BY_EXTENSION: Record<string, AssetMimeType> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

export const byteLengthError = (length: number): string | undefined => {
  if (length < 1) {
    return "The file is empty.";
  }

  if (length > MAX_ASSET_BYTES) {
    return `The file is ${length} bytes. The maximum is ${MAX_ASSET_BYTES} bytes.`;
  }

  return undefined;
};

export const mimeTypeFromExtension = (
  filePath: string,
): AssetMimeType | undefined => {
  const dot = filePath.lastIndexOf(".");
  if (dot < 0) return undefined;

  return MIME_BY_EXTENSION[filePath.slice(dot).toLowerCase()];
};

export const mimeTypeFromBytes = (bytes: Buffer): AssetMimeType | undefined => {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (bytes.length >= 6) {
    const header = bytes.subarray(0, 6).toString("ascii");
    if (header === "GIF87a" || header === "GIF89a") {
      return "image/gif";
    }
  }

  return undefined;
};

export const resolveAssetMimeType = (input: {
  bytes: Buffer;
  sourcePath?: string;
  override?: string;
}): AssetMimeType | string => {
  if (input.override) {
    return input.override;
  }

  const fromExtension = input.sourcePath
    ? mimeTypeFromExtension(input.sourcePath)
    : undefined;
  const fromBytes = mimeTypeFromBytes(input.bytes);

  if (fromExtension && fromBytes && fromExtension !== fromBytes) {
    return (
      `The file extension says ${fromExtension} but the bytes are ${fromBytes}. ` +
      "Pass --mime-type to choose one."
    );
  }

  if (fromExtension && !fromBytes) {
    return (
      `The file extension says ${fromExtension} but the bytes are not a JPEG, PNG, or GIF. ` +
      "Pass --mime-type to choose one."
    );
  }

  if (fromBytes) return fromBytes;

  return "Could not detect the MIME type. Pass --mime-type (image/jpeg, image/png, or image/gif).";
};

export const isAssetMimeType = (value: string): value is AssetMimeType =>
  (ASSET_MIME_TYPES as readonly string[]).includes(value);
