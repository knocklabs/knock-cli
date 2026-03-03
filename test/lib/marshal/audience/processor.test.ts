import { expect } from "chai";

import { AudienceData, buildAudienceDirBundle } from "@/lib/marshal/audience";
import { prepareResourceJson } from "@/lib/marshal/shared/helpers.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const remoteAudience: AudienceData<WithAnnotation> = {
  key: "paid-users",
  name: "Paid Users",
  conditions:
    '{"all":[{"variable":"plan","operator":"equal_to","argument":"paid"}]}',
  description: "Users on a paid plan",
  environment: "development",
  updated_at: "2024-06-25T19:24:48.714630Z",
  created_at: "2024-06-20T18:32:18.398053Z",
  sha: "<SOME_SHA>",
  __annotation: {
    extractable_fields: {
      conditions: { default: true, file_ext: "json" },
    },
    readonly_fields: ["key", "environment", "created_at", "updated_at", "sha"],
  },
};

describe("lib/marshal/audience/processor", () => {
  describe("prepareResourceJson", () => {
    it("moves over audience's readonly fields under __readonly field", () => {
      const audienceJson = prepareResourceJson(remoteAudience);

      expect(audienceJson.key).to.equal(undefined);
      expect(audienceJson.environment).to.equal(undefined);
      expect(audienceJson.created_at).to.equal(undefined);
      expect(audienceJson.updated_at).to.equal(undefined);
      expect(audienceJson.sha).to.equal(undefined);

      expect(audienceJson.__readonly).to.eql({
        key: "paid-users",
        environment: "development",
        created_at: "2024-06-20T18:32:18.398053Z",
      });
    });

    it("removes the __annotation field", () => {
      const audienceJson = prepareResourceJson(remoteAudience);
      expect(audienceJson.__annotation).to.equal(undefined);
    });
  });

  describe("buildAudienceDirBundle", () => {
    describe("given a fetched audience that has not been pulled before", () => {
      const result = buildAudienceDirBundle(remoteAudience);

      expect(result).to.eql({
        "conditions.json":
          '{"all":[{"variable":"plan","operator":"equal_to","argument":"paid"}]}',
        "audience.json": {
          name: "Paid Users",
          description: "Users on a paid plan",
          "conditions@": "conditions.json",
          __readonly: {
            key: "paid-users",
            environment: "development",
            created_at: "2024-06-20T18:32:18.398053Z",
          },
        },
      });
    });

    describe("given a fetched audience with a local version available", () => {
      it("returns a dir bundle based on a local version and default extract settings", () => {
        const localAudience = {
          name: "Paid Users",
          "conditions@": "custom/conditions.json",
        };

        const result = buildAudienceDirBundle(remoteAudience, localAudience);

        expect(result).to.eql({
          "custom/conditions.json":
            '{"all":[{"variable":"plan","operator":"equal_to","argument":"paid"}]}',
          "audience.json": {
            name: "Paid Users",
            description: "Users on a paid plan",
            "conditions@": "custom/conditions.json",
            __readonly: {
              key: "paid-users",
              environment: "development",
              created_at: "2024-06-20T18:32:18.398053Z",
            },
          },
        });
      });
    });

    describe("when called with a $schema", () => {
      it("returns a dir bundle with the $schema in the audience.json", () => {
        const result = buildAudienceDirBundle(
          remoteAudience,
          {},
          "https://schemas.knock.app/cli/audience.json",
        );

        expect(result["audience.json"]).to.contain({
          $schema: "https://schemas.knock.app/cli/audience.json",
        });
      });
    });
  });
});
