import * as path from "node:path";

import { Config } from "@oclif/core";
import { test } from "@oclif/test";
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
  settings: { method: "get", url: "https://example.com" },
  created_at: "2021-01-01T00:00:00Z",
  updated_at: "2021-01-01T00:00:00Z",
  sha: "abc123",
  __annotation: {
    extractable_fields: {},
    readonly_fields: ["environment", "key", "created_at", "updated_at", "sha"],
  },
};

const currCwd = process.cwd();

describe("commands/push reusable requests", () => {
  before(async () => {
    await Config.load(currCwd);
  });

  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
    process.chdir(sandboxDir);
    fs.outputJsonSync(
      path.resolve(
        sandboxDir,
        "reusable-requests",
        "fetch-user",
        REUSABLE_REQUEST_JSON,
      ),
      {
        name: "Fetch user",
        type: "http_fetch",
        settings: { method: "get", url: "https://example.com" },
      },
    );
  });

  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
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
    .command(["push", "--knock-dir", ".", "--force"])
    .it("upserts reusable requests from knock push", () => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.upsertReusableRequest as sinon.SinonStub,
        sinon.match.any,
        sinon.match({ key: "fetch-user" }),
      );
    });
});
