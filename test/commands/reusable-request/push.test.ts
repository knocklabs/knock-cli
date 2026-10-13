import * as path from "node:path";

import { Config } from "@oclif/core";
import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import ReusableRequestValidate from "@/commands/reusable-request/validate";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import {
  REUSABLE_REQUEST_JSON,
  ReusableRequestData,
  ReusableRequestType,
} from "@/lib/marshal/reusable-request";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const pushedReusableRequest: ReusableRequestData<WithAnnotation> = {
  key: "fetch-user",
  name: "Fetch user",
  type: ReusableRequestType.HttpFetch,
  description: "Loads a user from the API.",
  environment: "development",
  settings: {
    method: "get",
    url: "https://example.com",
  },
  created_at: "2021-01-01T00:00:00Z",
  updated_at: "2021-01-01T00:00:00Z",
  sha: "abc123",
  __annotation: {
    extractable_fields: {},
    readonly_fields: ["environment", "key", "created_at", "updated_at", "sha"],
  },
};

const currCwd = process.cwd();

describe("commands/reusable-request/push", () => {
  before(async () => {
    await Config.load(process.cwd());
  });

  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a local reusable request", () => {
    beforeEach(() => {
      const abspath = path.resolve(
        sandboxDir,
        "fetch-user",
        REUSABLE_REQUEST_JSON,
      );
      fs.outputJsonSync(abspath, {
        name: "Fetch user",
        type: "http_fetch",
        description: "Loads a user from the API.",
        settings: {
          method: "get",
          url: "https://example.com",
        },
        environment: "development",
        sha: "stale",
      });
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(ReusableRequestValidate, "validateAll", (stub) => stub.resolves([]))
      .stub(KnockApiV1.prototype, "upsertReusableRequest", (stub) =>
        stub.resolves(
          factory.resp({
            data: { reusable_request: pushedReusableRequest },
          }),
        ),
      )
      .stdout()
      .command([
        "reusable-request push",
        "fetch-user",
        "--environment",
        "development",
        "--branch",
        "my-feature-branch-123",
        "--commit",
        "--commit-message",
        "add fetch",
        "--allow-empty",
        "--force",
      ])
      .it("upserts the reusable request from the local file", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.upsertReusableRequest as sinon.SinonStub,
          sinon.match(
            ({ flags }) =>
              flags.environment === "development" &&
              flags.branch === "my-feature-branch-123" &&
              flags.annotate === true &&
              flags.commit === true &&
              flags["commit-message"] === "add fetch" &&
              flags["allow-empty"] === true &&
              flags.force === true,
          ),
          sinon.match({
            key: "fetch-user",
            name: "Fetch user",
            type: "http_fetch",
            description: "Loads a user from the API.",
            settings: {
              method: "get",
              url: "https://example.com",
            },
          }),
        );

        const written = fs.readJsonSync(
          path.resolve(sandboxDir, "fetch-user", REUSABLE_REQUEST_JSON),
        );
        expect(written.name).to.equal("Fetch user");
        expect(written.sha).to.equal(undefined);
        expect(written.__readonly.key).to.equal("fetch-user");
      });
  });

  describe("given an API error", () => {
    beforeEach(() => {
      const abspath = path.resolve(
        sandboxDir,
        "fetch-user",
        REUSABLE_REQUEST_JSON,
      );
      fs.outputJsonSync(abspath, {
        name: "Fetch user",
        type: "http_fetch",
        settings: { method: "get", url: "https://example.com" },
      });
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(ReusableRequestValidate, "validateAll", (stub) => stub.resolves([]))
      .stub(KnockApiV1.prototype, "upsertReusableRequest", (stub) =>
        stub.resolves(
          factory.resp({
            status: 422,
            data: {
              message: "reusable request is invalid",
              errors: [{ field: "settings.url", message: "is invalid" }],
            },
          }),
        ),
      )
      .stdout()
      .command(["reusable-request push", "fetch-user"])
      .catch(/reusable request is invalid/)
      .it("prints the API error");
  });
});
