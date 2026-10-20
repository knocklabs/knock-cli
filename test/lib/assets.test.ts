import { expect } from "@oclif/test";

import {
  byteLengthError,
  MAX_ASSET_BYTES,
  mimeTypeFromBytes,
  resolveAssetMimeType,
} from "@/lib/assets";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const gif = Buffer.from("GIF89a!", "ascii");

describe("lib/assets", () => {
  describe("byteLengthError", () => {
    it("rejects an empty file", () => {
      expect(byteLengthError(0)).to.equal("The file is empty.");
    });

    it("rejects a file over 5000000 bytes", () => {
      expect(byteLengthError(MAX_ASSET_BYTES + 1)).to.contain(
        `${MAX_ASSET_BYTES + 1}`,
      );
    });

    it("accepts a 1 byte file and the maximum", () => {
      expect(byteLengthError(1)).to.equal(undefined);
      expect(byteLengthError(MAX_ASSET_BYTES)).to.equal(undefined);
    });
  });

  describe("mimeTypeFromBytes", () => {
    it("recognizes png, jpeg, and gif signatures", () => {
      expect(mimeTypeFromBytes(png)).to.equal("image/png");
      expect(mimeTypeFromBytes(jpeg)).to.equal("image/jpeg");
      expect(mimeTypeFromBytes(gif)).to.equal("image/gif");
      expect(mimeTypeFromBytes(Buffer.from("GIF87a"))).to.equal("image/gif");
    });
  });

  describe("resolveAssetMimeType", () => {
    it("uses a matching extension and signature", () => {
      expect(
        resolveAssetMimeType({ bytes: png, sourcePath: "logo.png" }),
      ).to.deep.equal({ mimeType: "image/png" });
      expect(
        resolveAssetMimeType({ bytes: jpeg, sourcePath: "photo.JPG" }),
      ).to.deep.equal({ mimeType: "image/jpeg" });
    });

    it("uses the signature when the path has no image extension", () => {
      expect(
        resolveAssetMimeType({ bytes: png, sourcePath: "logo" }),
      ).to.deep.equal({ mimeType: "image/png" });
    });

    it("rejects an extension that disagrees with the bytes", () => {
      const resolved = resolveAssetMimeType({
        bytes: jpeg,
        sourcePath: "logo.png",
      });

      expect("error" in resolved && resolved.error).to.contain("image/png");
      expect("error" in resolved && resolved.error).to.contain("image/jpeg");
      expect("error" in resolved && resolved.error).to.contain("--mime-type");
    });

    it("uses an explicit override", () => {
      expect(
        resolveAssetMimeType({
          bytes: jpeg,
          override: "image/jpeg",
          sourcePath: "logo.png",
        }),
      ).to.deep.equal({ mimeType: "image/jpeg" });
    });

    it("asks for --mime-type when stdin bytes are not an image", () => {
      const resolved = resolveAssetMimeType({ bytes: Buffer.from("hello") });

      expect("error" in resolved && resolved.error).to.contain("--mime-type");
    });
  });
});
