import { Config } from "@oclif/core";
import { expect } from "@oclif/test";
import nock from "nock";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

const dummyConfig = new Config({ root: "/path/to/bin" });
const API_ORIGIN = "https://api.knock.app";

const reusableRequest = factory.reusableRequest();

describe("lib/api-v1 reusable requests", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("listReusableRequests", () => {
    it("GETs /v1/reusable_requests with the spec query params", async () => {
      const scope = nock(API_ORIGIN)
        .get("/v1/reusable_requests")
        .query({
          environment: "staging",
          branch: "feature-branch",
          annotate: "true",
          hide_uncommitted_changes: "true",
          after: "cursor-after",
          before: "cursor-before",
          limit: "25",
        })
        .reply(200, {
          entries: [reusableRequest],
          page_info: factory.pageInfo(),
        });

      const apiV1 = new KnockApiV1(factory.sessionContext(), dummyConfig);
      const resp = await apiV1.listReusableRequests(
        factory.props({
          flags: {
            environment: "staging",
            branch: "feature-branch",
            annotate: true,
            "hide-uncommitted-changes": true,
            after: "cursor-after",
            before: "cursor-before",
            limit: 25,
            "rogue-flag": "nope",
          },
        }),
      );

      expect(scope.isDone()).to.equal(true);
      expect(resp.status).to.equal(200);
      expect(resp.data.entries[0].key).to.equal("fetch-user");
    });
  });

  describe("getReusableRequest", () => {
    it("GETs /v1/reusable_requests/:key", async () => {
      const scope = nock(API_ORIGIN)
        .get("/v1/reusable_requests/fetch-user")
        .query({
          environment: "development",
          branch: "feature-branch",
          annotate: "true",
          hide_uncommitted_changes: "true",
        })
        .reply(200, reusableRequest);

      const apiV1 = new KnockApiV1(factory.sessionContext(), dummyConfig);
      const resp = await apiV1.getReusableRequest(
        factory.props({
          args: { reusableRequestKey: "fetch-user" },
          flags: {
            environment: "development",
            branch: "feature-branch",
            annotate: true,
            "hide-uncommitted-changes": true,
          },
        }),
      );

      expect(scope.isDone()).to.equal(true);
      expect(resp.data.key).to.equal("fetch-user");
      expect(resp.data.type).to.equal("http_fetch");
    });
  });

  describe("archiveReusableRequest", () => {
    it("DELETEs /v1/reusable_requests/:key with environment only", async () => {
      const scope = nock(API_ORIGIN)
        .delete("/v1/reusable_requests/fetch-user")
        .query({ environment: "development" })
        .reply(200, { result: "success" });

      const apiV1 = new KnockApiV1(factory.sessionContext(), dummyConfig);
      const resp = await apiV1.archiveReusableRequest(
        factory.props({
          args: { reusableRequestKey: "fetch-user" },
          flags: {
            environment: "development",
            branch: "feature-branch",
          },
        }),
      );

      expect(scope.isDone()).to.equal(true);
      expect(resp.data.result).to.equal("success");
    });
  });

  describe("validateReusableRequest", () => {
    it("PUTs /v1/reusable_requests/:key/validate", async () => {
      const scope = nock(API_ORIGIN)
        .put("/v1/reusable_requests/fetch-user/validate", {
          reusable_request: {
            type: "http_fetch",
            name: "Fetch user",
            settings: { method: "get", url: "https://example.com" },
          },
        })
        .query({
          environment: "development",
          branch: "feature-branch",
        })
        .reply(200, { reusable_request: reusableRequest });

      const apiV1 = new KnockApiV1(factory.sessionContext(), dummyConfig);
      const resp = await apiV1.validateReusableRequest(
        factory.props({
          flags: {
            environment: "development",
            branch: "feature-branch",
            annotate: true,
            commit: true,
            force: true,
          },
        }),
        {
          key: "fetch-user",
          type: "http_fetch" as const,
          name: "Fetch user",
          settings: { method: "get", url: "https://example.com" },
        },
      );

      expect(scope.isDone()).to.equal(true);
      expect(resp.status).to.equal(200);
    });
  });
});
