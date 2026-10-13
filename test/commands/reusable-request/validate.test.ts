import * as path from "node:path";

import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";
import { REUSABLE_REQUEST_JSON } from "@/lib/marshal/reusable-request";

const currCwd = process.cwd();

describe("commands/reusable-request/validate", () => {
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
      fs.outputJsonSync(
        path.resolve(sandboxDir, "fetch-user", REUSABLE_REQUEST_JSON),
        {
          name: "Fetch user",
          type: "http_fetch",
          settings: { method: "get", url: "https://example.com" },
          key: "should-not-be-required",
        },
      );
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "validateReusableRequest", (stub) =>
        stub.resolves(
          factory.resp({
            data: { reusable_request: factory.reusableRequest() },
          }),
        ),
      )
      .stdout()
      .command([
        "reusable-request validate",
        "fetch-user",
        "--environment",
        "development",
        "--branch",
        "my-feature-branch-123",
      ])
      .it("validates using the directory key", (ctx) => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.validateReusableRequest as sinon.SinonStub,
          sinon.match(
            ({ flags }) =>
              flags.environment === "development" &&
              flags.branch === "my-feature-branch-123",
          ),
          sinon.match({
            key: "fetch-user",
            type: "http_fetch",
            name: "Fetch user",
            settings: { method: "get", url: "https://example.com" },
          }),
        );
        expect(ctx.stdout).to.contain("Successfully validated");
        expect(ctx.stdout).to.contain("fetch-user");
      });
  });

  describe("given a validation error", () => {
    beforeEach(() => {
      fs.outputJsonSync(
        path.resolve(sandboxDir, "fetch-user", REUSABLE_REQUEST_JSON),
        {
          name: "Fetch user",
          type: "http_fetch",
          settings: { method: "get" },
        },
      );
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "validateReusableRequest", (stub) =>
        stub.resolves(
          factory.resp({
            status: 422,
            data: {
              message: "reusable request is invalid",
              errors: [{ field: "settings.url", message: "can't be blank" }],
            },
          }),
        ),
      )
      .stdout()
      .command(["reusable-request validate", "fetch-user"])
      .catch(/reusable request is invalid/)
      .it("prints the API validation error");
  });

  describe("given --json", () => {
    beforeEach(() => {
      fs.outputJsonSync(
        path.resolve(sandboxDir, "fetch-user", REUSABLE_REQUEST_JSON),
        {
          type: "http_fetch",
          settings: { method: "get", url: "https://example.com" },
        },
      );
      process.chdir(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "validateReusableRequest", (stub) =>
        stub.resolves(
          factory.resp({
            data: { reusable_request: factory.reusableRequest() },
          }),
        ),
      )
      .stdout()
      .command(["reusable-request validate", "fetch-user", "--json"])
      .it("prints the validated keys", (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.deep.equal({ keys: ["fetch-user"] });
      });
  });
});
