import { expect, test } from "@oclif/test";
import nock from "nock";

const API_ORIGIN = "https://control.knock.app";

const storageKey = "acc_123/proj_123/018f02cd-9230-71d2-8f70-b40e5e2a4f6d.png";

const asset = {
  asset_type: "library_asset",
  created_at: "2021-01-01T00:00:00Z",
  filename: "logo.png",
  id: "018f02cd-9230-71d2-8f70-b40e5e2a4f6d",
  mime_type: "image/png",
  updated_at: "2021-01-01T00:00:00Z",
  url: "https://assets.example.com/acc_123/proj_123/asset.png",
};

const createArgs = [
  "asset create",
  "--key",
  storageKey,
  "--filename",
  "logo.png",
];

describe("commands/asset/create", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("given no key flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["asset create", "--filename", "logo.png"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given no filename flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["asset create", "--key", storageKey])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a blank filename", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["asset create", "--key", storageKey, "--filename", "   "])
      .catch(/Asset filename is required/)
      .it("rejects a blank filename");
  });

  describe("given no service token", () => {
    test
      .command(createArgs)
      .catch(/No token found/)
      .it("refuses to run");
  });

  describe("given an environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([...createArgs, "--environment", "development"])
      .exit(2)
      .it("rejects --environment because assets are account-wide");
  });

  describe("given a branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([...createArgs, "--branch", "my-feature-branch-123"])
      .exit(2)
      .it("rejects --branch because assets are account-wide");
  });

  describe("given a service token and a storage key", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        nock(API_ORIGIN, {
          reqheaders: { authorization: "Bearer valid-token" },
        })
          .post("/v1/assets", { key: storageKey, filename: "logo.png" })
          .reply(201, asset);
      })
      .stdout()
      .command(createArgs)
      .it("creates the asset", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(ctx.stdout).to.contain(asset.id);
        expect(ctx.stdout).to.contain(asset.url);
        expect(ctx.stdout).to.contain("image/png");
      });
  });

  describe("given --service-token and --json", () => {
    test
      .do(() => {
        nock(API_ORIGIN, {
          reqheaders: { authorization: "Bearer flag-token" },
        })
          .post("/v1/assets", { key: storageKey, filename: "logo.png" })
          .reply(201, asset);
      })
      .stdout()
      .command([...createArgs, "--service-token", "flag-token", "--json"])
      .it("prints the created asset", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(JSON.parse(ctx.stdout)).to.deep.equal(asset);
      });
  });

  describe("given the api rejects the key", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        nock(API_ORIGIN)
          .post("/v1/assets")
          .reply(422, {
            message: "The file must already be uploaded",
            errors: [
              {
                field: "key",
                message: "is not an uploaded file",
              },
            ],
          });
      })
      .command(createArgs)
      .catch(/The file must already be uploaded/)
      .it("shows the api error");
  });
});
