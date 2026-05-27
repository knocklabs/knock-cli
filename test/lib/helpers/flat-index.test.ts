import * as path from "node:path";

import { Source } from "@knocklabs/mgmt/resources/data-sources";
import { expect } from "chai";
import * as fs from "fs-extra";

import { sandboxDir } from "@/lib/helpers/const";
import { pruneFlatIndexDir, writeFlatIndexDir } from "@/lib/helpers/flat-index";
import { DirContext } from "@/lib/helpers/fs";
import {
  buildDataSourceFileContent,
  DATA_SOURCE_SCHEMA,
} from "@/lib/marshal/data-source";

const mockDataSource = (): Source => ({
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
      settings: {
        endpoint: "https://example.com/dev",
      },
      mappings: [],
    },
    production: {
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-02T00:00:00.000Z",
      settings: {
        endpoint: "https://example.com/prod",
      },
      mappings: [],
    },
  },
});

describe("lib/helpers/flat-index", () => {
  const typeDirPath = path.resolve(sandboxDir, "config", "data-sources");
  let typeDir: DirContext;

  beforeEach(async () => {
    await fs.remove(sandboxDir);
    await fs.ensureDir(typeDirPath);
    typeDir = { abspath: typeDirPath, exists: true };
  });

  afterEach(async () => {
    await fs.remove(sandboxDir);
  });

  describe("writeFlatIndexDir", () => {
    it("writes flat json files for each item", async () => {
      const dataSource = mockDataSource();

      await writeFlatIndexDir(typeDir, [dataSource], {
        getKey: (item) => item.key,
        serialize: (item) =>
          buildDataSourceFileContent(item, undefined, DATA_SOURCE_SCHEMA),
      });

      const filePath = path.resolve(typeDirPath, "posthog.json");
      expect(fs.existsSync(filePath)).to.be.true;

      const content = fs.readJsonSync(filePath);
      expect(content.key).to.equal("posthog");
      expect(
        content.environment_settings.development.settings.endpoint,
      ).to.equal("https://example.com/dev");
      expect(content.created_at).to.equal("2024-01-01T00:00:00.000Z");
      expect(content.environment_settings.development.created_at).to.equal(
        "2024-01-01T00:00:00.000Z",
      );
      expect(content.$schema).to.equal(DATA_SOURCE_SCHEMA);
    });

    it("prunes stale files not present in the remote set", async () => {
      await fs.writeJson(path.resolve(typeDirPath, "stale.json"), {
        key: "stale",
      });

      await writeFlatIndexDir(typeDir, [mockDataSource()], {
        getKey: (item) => item.key,
        serialize: (item) => buildDataSourceFileContent(item),
      });

      expect(fs.existsSync(path.resolve(typeDirPath, "stale.json"))).to.be
        .false;
      expect(fs.existsSync(path.resolve(typeDirPath, "posthog.json"))).to.be
        .true;
    });

    it("prunes stale directories from a previous layout", async () => {
      await fs.outputJson(
        path.resolve(typeDirPath, "stale", "configuration.json"),
        { key: "stale" },
      );

      await writeFlatIndexDir(typeDir, [mockDataSource()], {
        getKey: (item) => item.key,
        serialize: (item) => buildDataSourceFileContent(item),
      });

      expect(fs.existsSync(path.resolve(typeDirPath, "stale"))).to.be.false;
      expect(fs.existsSync(path.resolve(typeDirPath, "posthog.json"))).to.be
        .true;
    });
  });

  describe("pruneFlatIndexDir", () => {
    it("removes json files whose keys are not in the remote set", async () => {
      await fs.writeJson(path.resolve(typeDirPath, "keep.json"), {
        key: "keep",
      });
      await fs.writeJson(path.resolve(typeDirPath, "remove.json"), {
        key: "remove",
      });

      await pruneFlatIndexDir(typeDir, ["keep"]);

      expect(fs.existsSync(path.resolve(typeDirPath, "keep.json"))).to.be.true;
      expect(fs.existsSync(path.resolve(typeDirPath, "remove.json"))).to.be
        .false;
    });
  });
});
