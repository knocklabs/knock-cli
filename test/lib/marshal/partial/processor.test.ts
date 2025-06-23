import { expect } from "chai";

import {
  buildPartialDirBundle,
  PartialData,
  PartialType,
} from "@/lib/marshal/partial";
import { prepareResourceJson } from "@/lib/marshal/shared/helpers.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const remotePartial: PartialData<WithAnnotation> = {
  key: "default",
  valid: true,
  visual_block_enabled: true,
  type: PartialType.Html,
  name: "Default",
  content: "<html><body><p> Example content </html></body><p>",
  description: "Default HTML partial",
  environment: "development",
  updated_at: "2023-10-02T19:24:48.714630Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  __annotation: {
    extractable_fields: {
      content: { default: true, file_ext: "txt" },
    },
    readonly_fields: [
      "key",
      "valid",
      "type",
      "environment",
      "created_at",
      "updated_at",
    ],
  },
};

describe("lib/marshal/partial/processor", () => {
  describe("prepareResourceJson", () => {
    it("removes all fields present in __readonly field", () => {
      const partialJson = prepareResourceJson(remotePartial);

      // Readonly fields should be removed
      expect(partialJson.key).to.equal(undefined);
      expect(partialJson.valid).to.equal(undefined);
      expect(partialJson.type).to.equal(undefined);
      expect(partialJson.environment).to.equal(undefined);
      expect(partialJson.created_at).to.equal(undefined);
      expect(partialJson.updated_at).to.equal(undefined);

      // Non-readonly fields should be preserved
      expect(partialJson.name).to.equal("Default");
      expect(partialJson.visual_block_enabled).to.equal(true);
      expect(partialJson.content).to.equal(
        "<html><body><p> Example content </html></body><p>",
      );
      expect(partialJson.description).to.equal("Default HTML partial");

      // __readonly itself should be removed
      expect(partialJson.__readonly).to.equal(undefined);
    });

    it("removes all __annotation fields", () => {
      const partialJson = prepareResourceJson(remotePartial);
      expect(partialJson.__annotation).to.equal(undefined);
    });
  });

  describe("buildPartialDirBundle", () => {
    describe("given a fetched partial that has not been pulled before", () => {
      const result = buildPartialDirBundle(remotePartial);

      expect(result).to.eql({
        "content.html": "<html><body><p> Example content </html></body><p>",
        "partial.json": {
          name: "Default",
          visual_block_enabled: true,
          description: "Default HTML partial",
          "content@": "content.html",
        },
      });
    });

    describe("given a fetched partial with a local version available", () => {
      it("returns a dir bundle based on a local version and default extract settings", () => {
        const localPartial = {
          name: "default",
          "content@": "foo/bar/partial.html",
        };

        const result = buildPartialDirBundle(remotePartial, localPartial);

        expect(result).to.eql({
          "foo/bar/partial.html":
            "<html><body><p> Example content </html></body><p>",
          "partial.json": {
            name: "Default",
            visual_block_enabled: true,
            description: "Default HTML partial",
            "content@": "foo/bar/partial.html",
          },
        });
      });
    });
  });
});
