import { expect } from "chai";
import { get } from "lodash";

import {
  buildPartialDirBundle,
  PartialData,
  PartialType,
  toPartialJson,
} from "@/lib/marshal/partial";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const remotePartial: PartialData<WithAnnotation> = {
  key: "default",
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
    readonly_fields: ["key", "type", "environment", "created_at", "updated_at"],
  },
};

describe("lib/marshal/partial/processor", () => {
  describe("toPartialJson", () => {
    it("moves over partial's readonly fields under __readonly field", () => {
      const partialJson = toPartialJson(remotePartial);

      expect(partialJson.key).to.equal(undefined);
      expect(partialJson.type).to.equal(undefined);
      expect(partialJson.environment).to.equal(undefined);
      expect(partialJson.created_at).to.equal(undefined);
      expect(partialJson.updated_at).to.equal(undefined);

      expect(partialJson.__readonly).to.eql({
        key: "default",
        type: PartialType.Html,
        environment: "development",
        created_at: "2023-09-18T18:32:18.398053Z",
        updated_at: "2023-10-02T19:24:48.714630Z",
      });
    });

    it("removes all __annotation fields", () => {
      const partialJson = toPartialJson(remotePartial);

      expect(get(partialJson, "__annotation")).to.equal(undefined);
    });
  });

  describe("buildPartialDirBundle", () => {
    describe("given a fetched partial that has not been pulled before", () => {
      const result = buildPartialDirBundle(remotePartial);

      expect(result).to.eql({
        "content.html": "<html><body><p> Example content </html></body><p>",
        "partial.json": {
          name: "Default",
          description: "Default HTML partial",
          "content@": "content.html",
          __readonly: {
            key: "default",
            type: PartialType.Html,
            environment: "development",
            created_at: "2023-09-18T18:32:18.398053Z",
            updated_at: "2023-10-02T19:24:48.714630Z",
          },
        },
      });
    });

    describe("given a fetched partial with a local version available", () => {
      it("returns a dir bundle based on a local version and default extract settings", () => {
        const localpartial = {
          name: "default",
          "content@": "foo/bar/partial.html",
        };

        const result = buildPartialDirBundle(remotePartial, localpartial);

        expect(result).to.eql({
          "foo/bar/partial.html":
            "<html><body><p> Example content </html></body><p>",
          "partial.json": {
            name: "Default",
            description: "Default HTML partial",
            "content@": "foo/bar/partial.html",
            __readonly: {
              key: "default",
              type: PartialType.Html,
              environment: "development",
              created_at: "2023-09-18T18:32:18.398053Z",
              updated_at: "2023-10-02T19:24:48.714630Z",
            },
          },
        });
      });
    });
  });
});
