import * as path from "node:path";

import axios, { type AxiosResponse } from "axios";

import { prune } from "@/lib/helpers/object.isomorphic";

// Spec: AssetUploadRequest.mime_type is one of these values.
export const ASSET_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
] as const;

export type AssetMimeType = (typeof ASSET_MIME_TYPES)[number];

// Spec: AssetUploadRequest.content_length maximum is 5_000_000, minimum is 1.
export const MAX_ASSET_BYTES = 5_000_000;

export type Asset = {
  id: string;
  mime_type: string;
  asset_type: string;
  url: string;
  created_at: string;
  updated_at: string;
  filename?: string | null;
};

export type AssetUpload = {
  key: string;
  upload_url: string;
  expires_in: number;
  mime_type: string;
  content_length: number;
  filename?: string | null;
};

export type ArchiveAssetResp = {
  result: string;
};

export type ResolvedAssetMimeType =
  | { mimeType: AssetMimeType }
  | { error: string };

// Knock calls used by assets. post and delete prepend /v1.
type AssetClient = {
  post(subpath: string, data?: unknown): Promise<AxiosResponse>;
  delete(subpath: string): Promise<AxiosResponse>;
};

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
): AssetMimeType | undefined =>
  MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()];

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
  override?: AssetMimeType;
}): ResolvedAssetMimeType => {
  if (input.override) {
    return { mimeType: input.override };
  }

  const fromExtension = input.sourcePath
    ? mimeTypeFromExtension(input.sourcePath)
    : undefined;
  const fromBytes = mimeTypeFromBytes(input.bytes);

  if (fromExtension && fromBytes && fromExtension !== fromBytes) {
    return {
      error:
        `The file extension says ${fromExtension} but the bytes are ${fromBytes}. ` +
        "Pass --mime-type to choose one.",
    };
  }

  if (fromExtension && !fromBytes) {
    return {
      error:
        `The file extension says ${fromExtension} but the bytes are not a JPEG, PNG, or GIF. ` +
        "Pass --mime-type to choose one.",
    };
  }

  if (fromBytes) return { mimeType: fromBytes };

  return {
    error:
      "Could not detect the MIME type. Pass --mime-type (image/jpeg, image/png, or image/gif).",
  };
};

export const requestAssetUpload = (
  api: AssetClient,
  input: {
    mime_type: AssetMimeType | string;
    content_length: number;
    filename?: string;
  },
): Promise<AxiosResponse<AssetUpload>> =>
  api.post(
    "/assets/uploads",
    prune({
      mime_type: input.mime_type,
      content_length: input.content_length,
      filename: input.filename,
    }),
  );

// Direct-to-storage PUT. Must not use the Knock client: the signed URL rejects
// the bearer token, and the signature covers Content-Type and Content-Length.
export const putAssetBytes = (
  upload: AssetUpload,
  bytes: Buffer,
): Promise<AxiosResponse> =>
  axios.put(upload.upload_url, bytes, {
    headers: {
      "Content-Type": upload.mime_type,
      "Content-Length": String(upload.content_length),
    },
    transformRequest: [(data) => data],
    transformResponse: [(data) => data],
    validateStatus: () => true,
    maxBodyLength: MAX_ASSET_BYTES,
    maxContentLength: MAX_ASSET_BYTES,
  });
