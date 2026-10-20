import { Config } from "@oclif/core";
import { expect } from "@oclif/test";
import nock from "nock";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { putAssetBytes, requestAssetUpload } from "@/lib/assets";

const dummyConfig = new Config({ root: "/path/to/bin" });
const API_ORIGIN = "https://api.knock.app";

const asset = {
  asset_type: "library_asset",
  created_at: "2021-01-01T00:00:00Z",
  filename: "logo.png",
  id: "018f02cd-9230-71d2-8f70-b40e5e2a4f6d",
  mime_type: "image/png",
  updated_at: "2021-01-01T00:00:00Z",
  url: "https://assets.example.com/acc_123/proj_123/asset.png",
};

const upload = {
  content_length: 20_480,
  expires_in: 300,
  filename: "logo.png",
  key: "acc_123/proj_123/018f02cd-9230-71d2-8f70-b40e5e2a4f6d.png",
  mime_type: "image/png",
  upload_url:
    "https://account-assets.example/acc_123/proj_123/file.png?X-Amz-Signature=sig",
};

describe("lib/api-v1 assets", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("createAsset", () => {
    it("POSTs /v1/assets with key and filename and no environment", async () => {
      let path = "";

      const scope = nock(API_ORIGIN, {
        reqheaders: { authorization: "Bearer valid-token" },
      })
        .post("/v1/assets", {
          key: upload.key,
          filename: "logo.png",
        })
        .reply((uri) => {
          path = uri;
          return [201, asset];
        });

      const apiV1 = new KnockApiV1(factory.sessionContext(), dummyConfig);
      const resp = await apiV1.createAsset({
        key: upload.key,
        filename: "logo.png",
      });

      expect(scope.isDone()).to.equal(true);
      expect(path).to.equal("/v1/assets");
      expect(resp.status).to.equal(201);
      expect(resp.data.id).to.equal(asset.id);
      expect(resp.data.url).to.equal(asset.url);
    });
  });

  describe("requestAssetUpload", () => {
    it("POSTs /v1/assets/uploads with the required upload fields", async () => {
      let path = "";

      const scope = nock(API_ORIGIN, {
        reqheaders: { authorization: "Bearer valid-token" },
      })
        .post("/v1/assets/uploads", {
          mime_type: "image/png",
          content_length: 20_480,
          filename: "logo.png",
        })
        .reply((uri) => {
          path = uri;
          return [201, upload];
        });

      const apiV1 = new KnockApiV1(factory.sessionContext(), dummyConfig);
      const resp = await requestAssetUpload(apiV1, {
        mime_type: "image/png",
        content_length: 20_480,
        filename: "logo.png",
      });

      expect(scope.isDone()).to.equal(true);
      expect(path).to.equal("/v1/assets/uploads");
      expect(resp.status).to.equal(201);
      expect(resp.data.key).to.equal(upload.key);
      expect(resp.data.upload_url).to.equal(upload.upload_url);
    });

    it("omits filename when it is not provided", async () => {
      const scope = nock(API_ORIGIN)
        .post("/v1/assets/uploads", {
          mime_type: "image/gif",
          content_length: 1,
        })
        .reply(201, { ...upload, filename: null, mime_type: "image/gif" });

      const apiV1 = new KnockApiV1(factory.sessionContext(), dummyConfig);
      const resp = await requestAssetUpload(apiV1, {
        mime_type: "image/gif",
        content_length: 1,
      });

      expect(scope.isDone()).to.equal(true);
      expect(resp.data.mime_type).to.equal("image/gif");
    });
  });

  describe("putAssetBytes", () => {
    it("PUTs the bytes to the signed URL with the signed headers and no bearer token", async () => {
      const bytes = Buffer.from("GIF89a!", "ascii");
      let contentType = "";
      let contentLength = "";
      let authorization = "";

      const scope = nock("https://account-assets.example")
        .put("/acc_123/proj_123/file.png")
        .query({ "X-Amz-Signature": "sig" })
        .reply(function (this: { req: { headers: Record<string, string> } }) {
          contentType = this.req.headers["content-type"];
          contentLength = this.req.headers["content-length"];
          authorization = this.req.headers.authorization;
          return [200, ""];
        });

      const resp = await putAssetBytes(
        { ...upload, content_length: bytes.length, mime_type: "image/gif" },
        bytes,
      );

      expect(scope.isDone()).to.equal(true);
      expect(resp.status).to.equal(200);
      expect(contentType).to.equal("image/gif");
      expect(contentLength).to.equal(String(bytes.length));
      expect(authorization).to.equal(undefined);
    });
  });

  describe("archiveAsset", () => {
    it("DELETEs /v1/assets/:asset_id with no query params", async () => {
      let path = "";

      const scope = nock(API_ORIGIN, {
        reqheaders: { authorization: "Bearer valid-token" },
      })
        .delete(`/v1/assets/${asset.id}`)
        .reply((uri) => {
          path = uri;
          return [200, { result: "success" }];
        });

      const apiV1 = new KnockApiV1(factory.sessionContext(), dummyConfig);
      const resp = await apiV1.archiveAsset(asset.id);

      expect(scope.isDone()).to.equal(true);
      expect(path).to.equal(`/v1/assets/${asset.id}`);
      expect(resp.status).to.equal(200);
      expect(resp.data.result).to.equal("success");
    });
  });
});
