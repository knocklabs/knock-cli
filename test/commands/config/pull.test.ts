import * as path from "node:path";

import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { sandboxDir } from "@/lib/helpers/const";

const mockDataSourceEntry = {
  key: "posthog",
  name: "PostHog",
  description: "PostHog source",
  custom_image_url: null,
};

const mockDataSource = {
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
};

const mockEnvironments = [
  {
    slug: "development",
    name: "Development",
    order: 0,
    owner: "system" as const,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-02T00:00:00.000Z",
  },
  {
    slug: "production",
    name: "Production",
    order: 1,
    owner: "system" as const,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-02T00:00:00.000Z",
  },
];

function createAsyncIterator<T>(items: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const item of items) {
        yield item;
      }
    },
  };
}

const currCwd = process.cwd();

describe("commands/config/pull", () => {
  beforeEach(async () => {
    await fs.remove(sandboxDir);
    await fs.ensureDir(sandboxDir);
    process.chdir(sandboxDir);
  });

  afterEach(async () => {
    process.chdir(currCwd);
    await fs.remove(sandboxDir);
  });

  describe("given --type data-sources", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: true }),
      )
      .stub(KnockMgmt.DataSources.prototype, "listSources", (stub) =>
        stub.resolves({ entries: [mockDataSourceEntry] }),
      )
      .stub(KnockMgmt.DataSources.prototype, "retrieve", (stub) =>
        stub.callsFake((_key: string, params: { environment: string }) =>
          Promise.resolve({
            ...mockDataSource,
            environment_settings: {
              [params.environment]:
                mockDataSource.environment_settings[
                  params.environment as keyof typeof mockDataSource.environment_settings
                ],
            },
          }),
        ),
      )
      .stub(KnockMgmt.Environments.prototype, "list", (stub) =>
        stub.returns(createAsyncIterator(mockEnvironments)),
      )
      .stdout()
      .command([
        "config pull",
        "--type",
        "data-sources",
        "--knock-dir",
        ".knock",
        "--force",
      ])
      .it("writes data source files under .knock/config/data-sources", () => {
        sinon.assert.calledOnce(
          KnockMgmt.DataSources.prototype.listSources as sinon.SinonStub,
        );

        const filePath = path.resolve(
          sandboxDir,
          ".knock",
          "config",
          "data-sources",
          "posthog.json",
        );
        expect(fs.existsSync(filePath)).to.be.true;

        const content = fs.readJsonSync(filePath);
        expect(content.key).to.equal("posthog");
        expect(content.created_at).to.equal("2024-01-01T00:00:00.000Z");
        expect(
          content.environment_settings.development.settings.endpoint,
        ).to.equal("https://example.com/dev");
        expect(
          content.environment_settings.production.settings.endpoint,
        ).to.equal("https://example.com/prod");
        expect(
          content.environment_settings.development.created_at,
        ).to.equal("2024-01-01T00:00:00.000Z");
      });
  });

  describe("given an unknown --type", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .stderr()
      .command(["config pull", "--type", "unknown", "--knock-dir", ".knock"])
      .exit(2)
      .it("exits with status 2");
  });
});
