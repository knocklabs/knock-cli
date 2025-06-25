import { expect } from "chai";

import { buildGuideDirBundle, GuideData } from "@/lib/marshal/guide";
import { prepareResourceJson } from "@/lib/marshal/shared/helpers.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const remoteGuide: GuideData<WithAnnotation> = {
  key: "success-banner",
  environment: "development",
  name: "Success Banner",
  description: "My little success banner",
  priority: 10,
  channel_key: "in-app-guide",
  valid: true,
  active: true,
  type: "banner",
  semver: "0.0.1",
  steps: [
    {
      ref: "step_1",
      name: "Step one",
      schema_key: "banner",
      schema_semver: "0.0.1",
      schema_variant_key: "default",
      values: {
        title: "The You You Are",
        message: "The work is mysterious and important",
      },
    },
  ],
  updated_at: "2023-10-02T19:24:48.714630Z",
  created_at: "2023-09-18T18:32:18.398053Z",
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {},
    readonly_fields: [
      "key",
      "active",
      "valid",
      "environment",
      "created_at",
      "updated_at",
      "sha",
    ],
  },
};

describe("lib/marshal/guide/processor", () => {
  describe("prepareResourceJson", () => {
    it("moves over guide's readonly fields under __readonly field", () => {
      const guideJson = prepareResourceJson(remoteGuide);

      expect(guideJson.key).to.equal(undefined);
      expect(guideJson.active).to.equal(undefined);
      expect(guideJson.valid).to.equal(undefined);
      expect(guideJson.environment).to.equal(undefined);
      expect(guideJson.created_at).to.equal(undefined);
      expect(guideJson.updated_at).to.equal(undefined);
      expect(guideJson.sha).to.equal(undefined);

      expect(guideJson.__readonly).to.eql({
        key: "success-banner",
        active: true,
        valid: true,
        environment: "development",
        created_at: "2023-09-18T18:32:18.398053Z",
      });
    });

    it("removes the __annotation field", () => {
      const guideJson = prepareResourceJson(remoteGuide);
      expect(guideJson.__annotation).to.equal(undefined);
    });
  });

  describe("buildGuideDirBundle", () => {
    describe("given a fetched guide that has not been pulled before", () => {
      const result = buildGuideDirBundle(remoteGuide);

      expect(result).to.eql({
        "guide.json": {
          name: "Success Banner",
          description: "My little success banner",
          priority: 10,
          channel_key: "in-app-guide",
          type: "banner",
          semver: "0.0.1",
          steps: [
            {
              ref: "step_1",
              name: "Step one",
              schema_key: "banner",
              schema_semver: "0.0.1",
              schema_variant_key: "default",
              values: {
                title: "The You You Are",
                message: "The work is mysterious and important",
              },
            },
          ],
          __readonly: {
            key: "success-banner",
            valid: true,
            active: true,
            environment: "development",
            created_at: "2023-09-18T18:32:18.398053Z",
          },
        },
      });
    });
  });
});
