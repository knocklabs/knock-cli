import { expect } from "chai";

import {
  buildDataSourceFileContent,
  DATA_SOURCE_SCHEMA,
  mergeEnvironmentSettings,
} from "@/lib/marshal/data-source";

describe("lib/marshal/data-source/processor", () => {
  describe("mergeEnvironmentSettings", () => {
    it("merges a single environment slice into an existing local file", () => {
      const local = {
        key: "posthog",
        environment_settings: {
          development: { settings: { endpoint: "old" }, mappings: [] },
        },
      };

      const merged = mergeEnvironmentSettings(local, "staging", {
        settings: { endpoint: "new" },
        mappings: [],
      });

      expect(merged.environment_settings).to.deep.equal({
        development: { settings: { endpoint: "old" }, mappings: [] },
        staging: { settings: { endpoint: "new" }, mappings: [] },
      });
    });
  });

  describe("buildDataSourceFileContent", () => {
    it("writes the API payload as-is and adds $schema when provided", () => {
      const remote = {
        key: "posthog",
        name: "PostHog",
        description: "PostHog source",
        custom_image_url: null,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
        environment_settings: {
          development: {
            created_at: "2024-01-01T00:00:00.000Z",
            updated_at: "2024-01-02T00:00:00.000Z",
            settings: { endpoint: "https://example.com/dev" },
            mappings: [],
          },
        },
      };

      const content = buildDataSourceFileContent(
        remote,
        undefined,
        DATA_SOURCE_SCHEMA,
      );

      expect(content).to.deep.equal({
        ...remote,
        $schema: DATA_SOURCE_SCHEMA,
      });
    });

    it("preserves a local $schema when no schema is passed in", () => {
      const remote = {
        key: "posthog",
        name: "PostHog",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
        environment_settings: {},
      };

      const content = buildDataSourceFileContent(remote, {
        $schema: DATA_SOURCE_SCHEMA,
      });

      expect(content.$schema).to.equal(DATA_SOURCE_SCHEMA);
    });
  });
});
