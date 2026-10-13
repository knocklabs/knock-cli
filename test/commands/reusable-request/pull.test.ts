import * as path from "node:path";

import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import {
  REUSABLE_REQUEST_JSON,
  ReusableRequestData,
  ReusableRequestType,
} from "@/lib/marshal/reusable-request";
import { WithAnnotation } from "@/lib/marshal/shared/types";

const mockReusableRequest: ReusableRequestData<WithAnnotation> = {
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

describe("commands/reusable-request/pull", () => {
  beforeEach(() => {
    fs.removeSync(sandboxDir);
    fs.ensureDirSync(sandboxDir);
  });
  afterEach(() => {
    process.chdir(currCwd);
    fs.removeSync(sandboxDir);
  });

  describe("given a reusable request key", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getReusableRequest", (stub) =>
        stub.resolves(factory.resp({ data: mockReusableRequest })),
      )
      .stdout()
      .command([
        "reusable-request pull",
        "fetch-user",
        "--environment",
        "development",
        "--branch",
        "my-feature-branch-123",
        "--force",
      ])
      .it(
        "fetches the reusable request and writes reusable_request.json",
        () => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.getReusableRequest as sinon.SinonStub,
            sinon.match(
              ({ args, flags }) =>
                args.reusableRequestKey === "fetch-user" &&
                flags.environment === "development" &&
                flags.branch === "my-feature-branch-123" &&
                flags.annotate === true,
            ),
          );

          const jsonPath = path.resolve(
            sandboxDir,
            "fetch-user",
            REUSABLE_REQUEST_JSON,
          );
          const reusableRequestJson = fs.readJsonSync(jsonPath);
          expect(reusableRequestJson.name).to.equal("Fetch user");
          expect(reusableRequestJson.type).to.equal("http_fetch");
          expect(reusableRequestJson.settings.method).to.equal("get");
          expect(reusableRequestJson.settings.url).to.equal(
            "https://example.com",
          );
          expect(reusableRequestJson.environment).to.equal(undefined);
          expect(reusableRequestJson.sha).to.equal(undefined);
          expect(reusableRequestJson.__readonly.key).to.equal("fetch-user");
        },
      );
  });

  describe("given --all", () => {
    beforeEach(() => {
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: true }),
      )
      .stub(KnockApiV1.prototype, "listReusableRequests", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              entries: [
                mockReusableRequest,
                {
                  ...mockReusableRequest,
                  key: "fetch-org",
                  name: "Fetch org",
                },
              ],
              page_info: factory.pageInfo(),
            },
          }),
        ),
      )
      .stdout()
      .command([
        "reusable-request pull",
        "--all",
        "--reusable-requests-dir",
        "reusable-requests",
        "--force",
      ])
      .it("writes one directory per reusable request", () => {
        const first = path.resolve(
          sandboxDir,
          "reusable-requests",
          "fetch-user",
          REUSABLE_REQUEST_JSON,
        );
        const second = path.resolve(
          sandboxDir,
          "reusable-requests",
          "fetch-org",
          REUSABLE_REQUEST_JSON,
        );

        expect(fs.readJsonSync(first).name).to.equal("Fetch user");
        expect(fs.readJsonSync(second).name).to.equal("Fetch org");
      });
  });
});
