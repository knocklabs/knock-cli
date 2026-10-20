import * as os from "node:os";
import * as path from "node:path";
import { PassThrough } from "node:stream";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import nock from "nock";

const API_ORIGIN = "https://control.knock.app";
const STORAGE_ORIGIN = "https://account-assets.example";
const STORAGE_PATH = "/acc_123/proj_123/file.png";
const dir = path.join(os.tmpdir(), "knock-asset-upload");

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

const asset = {
  asset_type: "library_asset",
  created_at: "2021-01-01T00:00:00Z",
  filename: "logo.png",
  id: "018f02cd-9230-71d2-8f70-b40e5e2a4f6d",
  mime_type: "image/png",
  updated_at: "2021-01-01T00:00:00Z",
  url: "https://assets.example.com/acc_123/proj_123/asset.png",
};

const uploadFor = (bytes: Buffer, filename: string, mimeType: string) => ({
  content_length: bytes.length,
  expires_in: 300,
  filename,
  key: "acc_123/proj_123/018f02cd-9230-71d2-8f70-b40e5e2a4f6d.png",
  mime_type: mimeType,
  upload_url: `${STORAGE_ORIGIN}${STORAGE_PATH}?X-Amz-Signature=sig`,
});

const mockCopy = (bytes: Buffer, filename: string, mimeType: string) => {
  const upload = uploadFor(bytes, filename, mimeType);
  let putAuthorization: string | undefined;
  let putContentType = "";
  let putContentLength = "";

  nock(API_ORIGIN, {
    reqheaders: { authorization: "Bearer valid-token" },
  })
    .post("/v1/assets/uploads", {
      content_length: bytes.length,
      filename,
      mime_type: mimeType,
    })
    .reply(201, upload);

  nock(STORAGE_ORIGIN)
    .put(STORAGE_PATH)
    .query({ "X-Amz-Signature": "sig" })
    .reply(function (this: { req: { headers: Record<string, string> } }) {
      putAuthorization = this.req.headers.authorization;
      putContentType = this.req.headers["content-type"];
      putContentLength = this.req.headers["content-length"];
      return [200, ""];
    });

  nock(API_ORIGIN, {
    reqheaders: { authorization: "Bearer valid-token" },
  })
    .post("/v1/assets", { filename, key: upload.key })
    .reply(201, { ...asset, filename, mime_type: mimeType });

  return {
    putAuthorization: () => putAuthorization,
    putContentLength: () => putContentLength,
    putContentType: () => putContentType,
  };
};

describe("commands/asset/upload", () => {
  const originalStdin = process.stdin;

  beforeEach(async () => {
    nock.disableNetConnect();
    await fs.remove(dir);
    await fs.ensureDir(dir);
  });

  afterEach(async () => {
    Object.defineProperty(process, "stdin", {
      configurable: true,
      value: originalStdin,
    });
    nock.cleanAll();
    nock.enableNetConnect();
    await fs.remove(dir);
  });

  describe("given no file", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["asset upload"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given no service token", () => {
    test
      .command(["asset upload", "logo.png"])
      .catch(/No token found/)
      .it("refuses to run");
  });

  describe("given an environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["asset upload", "logo.png", "--environment", "development"])
      .exit(2)
      .it("rejects --environment because assets are account-wide");
  });

  describe("given a branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command([
        "asset upload",
        "logo.png",
        "--branch",
        "my-feature-branch-123",
      ])
      .exit(2)
      .it("rejects --branch because assets are account-wide");
  });

  describe("given a png file", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(async () => {
        await fs.writeFile(path.join(dir, "logo.png"), png);
        mockCopy(png, "logo.png", "image/png");
      })
      .stdout()
      .command(["asset upload", path.join(dir, "logo.png"), "--json"])
      .it("uploads the bytes and prints the created asset", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        const parsed = JSON.parse(ctx.stdout);
        expect(parsed).to.deep.equal({
          ...asset,
          filename: "logo.png",
          mime_type: "image/png",
        });
        expect(parsed.upload_url).to.equal(undefined);
        expect(parsed.key).to.equal(undefined);
      });
  });

  describe("given a png file without --json", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(async () => {
        await fs.writeFile(path.join(dir, "logo.png"), png);
        mockCopy(png, "logo.png", "image/png");
      })
      .stdout()
      .command(["asset upload", path.join(dir, "logo.png")])
      .it("prints the asset id and url", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(ctx.stdout).to.contain(asset.id);
        expect(ctx.stdout).to.contain(asset.url);
        expect(ctx.stdout).to.not.contain("upload_url");
      });
  });

  describe("given --filename", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(async () => {
        await fs.writeFile(path.join(dir, "logo.png"), png);
        mockCopy(png, "Brand logo.png", "image/png");
      })
      .stdout()
      .command([
        "asset upload",
        path.join(dir, "logo.png"),
        "--filename",
        "Brand logo.png",
        "--json",
      ])
      .it("sends the display name instead of the basename", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(JSON.parse(ctx.stdout).filename).to.equal("Brand logo.png");
      });
  });

  describe("given a jpeg named with a png extension", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(async () => {
        await fs.writeFile(path.join(dir, "logo.png"), jpeg);
      })
      .command(["asset upload", path.join(dir, "logo.png")])
      .catch(/extension says image\/png but the bytes are image\/jpeg/)
      .it("does not request an upload");
  });

  describe("given --mime-type that overrides a disagreement", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(async () => {
        await fs.writeFile(path.join(dir, "logo.png"), jpeg);
        mockCopy(jpeg, "logo.png", "image/jpeg");
      })
      .stdout()
      .command([
        "asset upload",
        path.join(dir, "logo.png"),
        "--mime-type",
        "image/jpeg",
        "--json",
      ])
      .it("uses the override", () => {
        expect(nock.isDone()).to.equal(true);
      });
  });

  describe("given an unsupported mime type", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["asset upload", "logo.png", "--mime-type", "image/webp"])
      .exit(2)
      .it("rejects mime types outside the spec");
  });

  describe("given an empty file", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(async () => {
        await fs.writeFile(path.join(dir, "logo.png"), Buffer.alloc(0));
      })
      .command(["asset upload", path.join(dir, "logo.png")])
      .catch(/The file is empty/)
      .it("rejects the file before calling the api");
  });

  describe("given a file over 5000000 bytes", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(async () => {
        const fd = await fs.open(path.join(dir, "big.png"), "w");
        await fs.ftruncate(fd, 5_000_001);
        await fs.close(fd);
      })
      .command(["asset upload", path.join(dir, "big.png")])
      .catch((error: Error) => {
        expect(error.message).to.contain("5000001");
        expect(error.message).to.contain("maximum");
      })
      .it("rejects the file before calling the api");
  });

  describe("given a missing file", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["asset upload", path.join(dir, "missing.png")])
      .catch(/No such file/)
      .it("reports the missing path");
  });

  describe("given a directory", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["asset upload", dir])
      .catch(/is not a file/)
      .it("rejects the directory");
  });

  describe("given stdin without --filename", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["asset upload", "-"])
      .catch(/Pass --filename when uploading from stdin/)
      .it("requires a display name");
  });

  describe("given stdin", () => {
    const gif = Buffer.from("GIF89a!", "ascii");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        const stream = new PassThrough();
        Object.defineProperty(process, "stdin", {
          configurable: true,
          value: stream,
        });
        stream.end(gif);
        mockCopy(gif, "logo.gif", "image/gif");
      })
      .stdout()
      .command(["asset upload", "-", "--filename", "logo.gif", "--json"])
      .it("uploads the piped bytes", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        const parsed = JSON.parse(ctx.stdout);
        expect(parsed.id).to.equal(asset.id);
        expect(parsed.filename).to.equal("logo.gif");
        expect(parsed.mime_type).to.equal("image/gif");
      });
  });

  describe("given the signed length does not match the file", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(async () => {
        await fs.writeFile(path.join(dir, "logo.png"), png);
        nock(API_ORIGIN)
          .post("/v1/assets/uploads")
          .reply(201, uploadFor(Buffer.alloc(4), "logo.png", "image/png"));
      })
      .command(["asset upload", path.join(dir, "logo.png")])
      .catch(/signed for 4 bytes/)
      .it("does not upload or create the asset");
  });

  describe("given the storage PUT fails", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(async () => {
        await fs.writeFile(path.join(dir, "logo.png"), png);
        nock(API_ORIGIN)
          .post("/v1/assets/uploads")
          .reply(201, uploadFor(png, "logo.png", "image/png"));
        nock(STORAGE_ORIGIN).put(STORAGE_PATH).query(true).reply(403, "");
        nock(API_ORIGIN).post("/v1/assets").reply(201, asset);
      })
      .command(["asset upload", path.join(dir, "logo.png")])
      .catch(/Upload failed \(403\)/)
      .it("does not create the asset", () => {
        expect(
          nock.pendingMocks().some((mock) => mock.includes("POST")),
        ).to.equal(true);
      });
  });

  describe("given create fails after the upload", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(async () => {
        await fs.writeFile(path.join(dir, "logo.png"), png);
        nock(API_ORIGIN)
          .post("/v1/assets/uploads")
          .reply(201, uploadFor(png, "logo.png", "image/png"));
        nock(STORAGE_ORIGIN).put(STORAGE_PATH).query(true).reply(200, "");
        nock(API_ORIGIN).post("/v1/assets").reply(422, {
          message: "The file must already be uploaded",
        });
      })
      .command(["asset upload", path.join(dir, "logo.png")])
      .catch(/The file must already be uploaded/)
      .it("shows the api error and prints no asset");
  });
});
