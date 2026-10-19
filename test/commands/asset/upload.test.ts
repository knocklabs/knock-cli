import { expect, test } from "@oclif/test";
import nock from "nock";

const API_ORIGIN = "https://control.knock.app";

const upload = {
  content_length: 20_480,
  expires_in: 300,
  filename: "logo.png",
  key: "acc_123/proj_123/018f02cd-9230-71d2-8f70-b40e5e2a4f6d.png",
  mime_type: "image/png",
  upload_url:
    "https://account-assets.example/acc_123/proj_123/file.png?X-Amz-Signature=sig",
};

const uploadArgs = [
  "asset upload",
  "--mime-type",
  "image/png",
  "--content-length",
  "20480",
  "--filename",
  "logo.png",
];

describe("commands/asset/upload", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("given no mime type", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["asset upload", "--content-length", "20480"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given an unsupported mime type", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([
        "asset upload",
        "--mime-type",
        "image/webp",
        "--content-length",
        "20480",
      ])
      .exit(2)
      .it("rejects mime types outside the spec");
  });

  describe("given a content length above 5000000", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([
        "asset upload",
        "--mime-type",
        "image/jpeg",
        "--content-length",
        "5000001",
      ])
      .exit(2)
      .it("rejects a file larger than the spec maximum");
  });

  describe("given a content length of 0", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([
        "asset upload",
        "--mime-type",
        "image/jpeg",
        "--content-length",
        "0",
      ])
      .exit(2)
      .it("rejects an empty file");
  });

  describe("given an environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([...uploadArgs, "--environment", "development"])
      .exit(2)
      .it("rejects --environment because assets are account-wide");
  });

  describe("given a branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([...uploadArgs, "--branch", "my-feature-branch-123"])
      .exit(2)
      .it("rejects --branch because assets are account-wide");
  });

  describe("given no service token", () => {
    test
      .command(uploadArgs)
      .catch(/No token found/)
      .it("refuses to run");
  });

  describe("given a valid upload request", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        nock(API_ORIGIN, {
          reqheaders: { authorization: "Bearer valid-token" },
        })
          .post("/v1/assets/uploads", {
            mime_type: "image/png",
            content_length: 20_480,
            filename: "logo.png",
          })
          .reply(201, upload);
      })
      .stdout()
      .command(uploadArgs)
      .it("prints the upload url and key", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(ctx.stdout).to.contain(upload.upload_url);
        expect(ctx.stdout).to.contain(upload.key);
        expect(ctx.stdout).to.contain("Content-Type: image/png");
        expect(ctx.stdout).to.contain("Content-Length: 20480");
        expect(ctx.stdout).to.contain("300 seconds");
      });
  });

  describe("given --json without a filename", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        nock(API_ORIGIN)
          .post("/v1/assets/uploads", {
            mime_type: "image/gif",
            content_length: 5_000_000,
          })
          .reply(201, {
            ...upload,
            filename: null,
            mime_type: "image/gif",
            content_length: 5_000_000,
          });
      })
      .stdout()
      .command([
        "asset upload",
        "--mime-type",
        "image/gif",
        "--content-length",
        "5000000",
        "--json",
      ])
      .it("prints the upload response and omits filename", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        const parsed = JSON.parse(ctx.stdout);
        expect(parsed.mime_type).to.equal("image/gif");
        expect(parsed.content_length).to.equal(5_000_000);
        expect(parsed.key).to.equal(upload.key);
      });
  });

  describe("given the api rejects the upload", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        nock(API_ORIGIN).post("/v1/assets/uploads").reply(422, {
          message: "One or more parameters supplied were invalid",
        });
      })
      .command(uploadArgs)
      .catch(/One or more parameters supplied were invalid/)
      .it("shows the api error");
  });
});
