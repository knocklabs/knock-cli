import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import nock from "nock";

const API_ORIGIN = "https://control.knock.app";
const assetId = "018f02cd-9230-71d2-8f70-b40e5e2a4f6d";

describe("commands/asset/archive", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("given no asset id", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["asset archive"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given an asset id that is not a uuid", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["asset archive", "logo.png", "--force"])
      .catch(/must be a UUID/)
      .it("rejects the id before calling the api");
  });

  describe("given no service token", () => {
    test
      .command(["asset archive", assetId, "--force"])
      .catch(/No token found/)
      .it("refuses to run");
  });

  describe("given an environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([
        "asset archive",
        assetId,
        "--environment",
        "development",
        "--force",
      ])
      .exit(2)
      .it("rejects --environment because assets are account-wide");
  });

  describe("given a branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([
        "asset archive",
        assetId,
        "--branch",
        "my-feature-branch-123",
        "--force",
      ])
      .exit(2)
      .it("rejects --branch because assets are account-wide");
  });

  describe("given --force", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        nock(API_ORIGIN, {
          reqheaders: { authorization: "Bearer valid-token" },
        })
          .delete(`/v1/assets/${assetId}`)
          .reply(200, { result: "success" });
      })
      .stdout()
      .command(["asset archive", assetId, "--force"])
      .it("archives the asset", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(ctx.stdout).to.contain(
          `Successfully archived asset \`${assetId}\``,
        );
      });
  });

  describe("given --json and --force", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        nock(API_ORIGIN)
          .delete(`/v1/assets/${assetId}`)
          .reply(200, { result: "success" });
      })
      .stdout()
      .command(["asset archive", assetId, "--force", "--json"])
      .it("prints the archive response", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(JSON.parse(ctx.stdout)).to.deep.equal({ result: "success" });
      });
  });

  describe("given --json without --force", () => {
    let requested = false;

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        requested = false;
        nock(API_ORIGIN)
          .delete(`/v1/assets/${assetId}`)
          .reply(() => {
            requested = true;
            return [200, { result: "success" }];
          });
      })
      .stdout()
      .command(["asset archive", assetId, "--json"])
      .it("does not archive", (ctx) => {
        const parsed = JSON.parse(ctx.stdout);
        expect(parsed.error.oclif.exit).to.equal(2);
        expect(parsed.result).to.equal(undefined);
        expect(requested).to.equal(false);
      });
  });

  describe("given confirmation prompt is declined", () => {
    let requested = false;

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: false }),
      )
      .do(() => {
        requested = false;
        nock(API_ORIGIN)
          .delete(`/v1/assets/${assetId}`)
          .reply(() => {
            requested = true;
            return [200, { result: "success" }];
          });
      })
      .stdout()
      .command(["asset archive", assetId])
      .it("does not archive when declined", (ctx) => {
        expect(ctx.stdout).to.contain("Archive cancelled");
        expect(requested).to.equal(false);
      });
  });

  describe("given archive fails", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        nock(API_ORIGIN).delete(`/v1/assets/${assetId}`).reply(404, {
          message: "The resource you requested does not exist",
        });
      })
      .command(["asset archive", assetId, "--force"])
      .catch(/The resource you requested does not exist/)
      .it("shows the api error");
  });
});
