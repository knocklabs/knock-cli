import { expect } from "chai";

import { factory } from "@/../test/support";
import {
  buildReusableStepDirBundle,
  ReusableStepData,
} from "@/lib/marshal/reusable-step";
import { prepareResourceJson } from "@/lib/marshal/shared/helpers.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { StepType } from "@/lib/marshal/workflow/types";

const remoteReusableStep: ReusableStepData<WithAnnotation> = {
  ...factory.reusableStep({
    id: "reusable-step-id",
    created_at: "2023-09-18T18:32:18.398053Z",
    updated_at: "2023-10-02T19:24:48.714630Z",
  }),
  __annotation: {
    extractable_fields: {},
    readonly_fields: ["id", "type", "created_at", "updated_at", "sha"],
  },
};

describe("lib/marshal/reusable-step/processor", () => {
  describe("prepareResourceJson", () => {
    it("moves over reusable step's readonly fields under __readonly field", () => {
      const reusableStepJson = prepareResourceJson(remoteReusableStep);

      expect(reusableStepJson.id).to.equal(undefined);
      expect(reusableStepJson.type).to.equal(undefined);
      expect(reusableStepJson.created_at).to.equal(undefined);
      expect(reusableStepJson.updated_at).to.equal(undefined);
      expect(reusableStepJson.sha).to.equal(undefined);

      expect(reusableStepJson.__readonly).to.eql({
        id: "reusable-step-id",
        type: StepType.HttpFetch,
        created_at: "2023-09-18T18:32:18.398053Z",
      });
    });

    it("removes the __annotation field", () => {
      const reusableStepJson = prepareResourceJson(remoteReusableStep);
      expect(reusableStepJson.__annotation).to.equal(undefined);
    });
  });

  describe("buildReusableStepDirBundle", () => {
    describe("given a fetched reusable step that has not been pulled before", () => {
      it("returns a dir bundle with reusable-step.json", () => {
        const result = buildReusableStepDirBundle(remoteReusableStep);

        expect(result).to.eql({
          "reusable-step.json": {
            key: "fetch-user-data",
            step: {
              type: "http_fetch",
              url: "https://api.example.com/users/{{ recipient.id }}",
              method: "GET",
              headers: {
                Authorization: "Bearer {{ data.api_token }}",
                "Content-Type": "application/json",
              },
              timeout: 30_000,
              retry_policy: {
                max_attempts: 3,
                backoff_type: "exponential",
                initial_delay: 1000,
              },
            },
            __readonly: {
              id: "reusable-step-id",
              type: StepType.HttpFetch,
              created_at: "2023-09-18T18:32:18.398053Z",
            },
          },
        });
      });
    });

    describe("given a fetched reusable step with a local version available", () => {
      it("returns a dir bundle based on a local version", () => {
        const localReusableStep = {
          key: "fetch-user-data",
          step: {
            type: "http_fetch",
            url: "https://api.example.com/users/{{ recipient.id }}",
            method: "GET",
          },
        };

        const result = buildReusableStepDirBundle(
          remoteReusableStep,
          localReusableStep,
        );

        expect(result).to.eql({
          "reusable-step.json": {
            key: "fetch-user-data",
            step: {
              type: "http_fetch",
              url: "https://api.example.com/users/{{ recipient.id }}",
              method: "GET",
              headers: {
                Authorization: "Bearer {{ data.api_token }}",
                "Content-Type": "application/json",
              },
              timeout: 30_000,
              retry_policy: {
                max_attempts: 3,
                backoff_type: "exponential",
                initial_delay: 1000,
              },
            },
            __readonly: {
              id: "reusable-step-id",
              type: StepType.HttpFetch,
              created_at: "2023-09-18T18:32:18.398053Z",
            },
          },
        });
      });
    });
  });
});
