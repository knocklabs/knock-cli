import { expect } from "chai";

import {
  buildDataSourceFileContent,
  buildDataSourceUpsertRequest,
  DATA_SOURCE_SCHEMA,
  mergeDataSourcePushResponse,
  mergeEnvironmentSettings,
  resolveDataSourceEnvironmentsToPush,
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

  describe("buildDataSourceUpsertRequest", () => {
    it("strips read-only fields from the upsert payload", () => {
      const local = {
        key: "posthog",
        name: "PostHog",
        description: "PostHog source",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
        environment_settings: {
          development: {
            created_at: "2024-01-01T00:00:00.000Z",
            updated_at: "2024-01-02T00:00:00.000Z",
            settings: { endpoint: "https://example.com/dev" },
            mappings: [
              {
                created_at: "2024-01-01T00:00:00.000Z",
                updated_at: "2024-01-02T00:00:00.000Z",
                event_type: "user.created",
                action_type: "users_identify",
                is_deleted: false,
              },
            ],
          },
        },
      };

      const request = buildDataSourceUpsertRequest(local, "development");

      expect(request).to.deep.equal({
        name: "PostHog",
        description: "PostHog source",
        custom_image_url: null,
        environment_settings: {
          development: {
            settings: { endpoint: "https://example.com/dev" },
            mappings: [
              {
                event_type: "user.created",
                action_type: "users_identify",
                is_deleted: false,
              },
            ],
          },
        },
      });
    });
  });

  describe("mergeDataSourcePushResponse", () => {
    it("merges a pushed environment slice back into the local file", () => {
      const local = {
        key: "posthog",
        name: "Old name",
        environment_settings: {
          production: { settings: { endpoint: "prod" }, mappings: [] },
        },
      };

      const remote = {
        key: "posthog",
        name: "PostHog",
        description: null,
        custom_image_url: null,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-02T00:00:00.000Z",
        environment_settings: {
          development: {
            created_at: "2024-01-01T00:00:00.000Z",
            updated_at: "2024-01-02T00:00:00.000Z",
            settings: { endpoint: "dev" },
            mappings: [],
          },
        },
      };

      const merged = mergeDataSourcePushResponse(
        local,
        remote,
        "development",
      );

      expect(merged.name).to.equal("PostHog");
      expect(merged.environment_settings).to.deep.equal({
        production: { settings: { endpoint: "prod" }, mappings: [] },
        development: remote.environment_settings.development,
      });
    });
  });

  describe("resolveDataSourceEnvironmentsToPush", () => {
    it("returns all environments when no filter is provided", () => {
      const environments = resolveDataSourceEnvironmentsToPush({
        environment_settings: {
          development: {},
          production: {},
        },
      });

      expect(environments).to.deep.equal(["development", "production"]);
    });

    it("returns only the requested environment when present", () => {
      const environments = resolveDataSourceEnvironmentsToPush(
        {
          environment_settings: {
            development: {},
          },
        },
        "development",
      );

      expect(environments).to.deep.equal(["development"]);
    });

    it("returns an empty list when the requested environment is missing", () => {
      const environments = resolveDataSourceEnvironmentsToPush(
        {
          environment_settings: {
            development: {},
          },
        },
        "production",
      );

      expect(environments).to.deep.equal([]);
    });
  });
});
