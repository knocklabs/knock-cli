import * as path from "node:path";

import { Config } from "@oclif/core";
import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { sandboxDir } from "@/lib/helpers/const";

const currCwd = process.cwd();

describe("commands/reusable-request/archive", () => {
  // Load the CLI before tests change cwd, so oclif keeps using src/.
  before(async () => {
    await Config.load(process.cwd());
  });

  describe("given no reusable request key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["reusable-request archive", "--environment", "development"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given no environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["reusable-request archive", "fetch-user"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a key with --force", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "archiveReusableRequest", (stub) =>
        stub.resolves(factory.resp({ data: { result: "success" } })),
      )
      .stdout()
      .command([
        "reusable-request archive",
        "fetch-user",
        "--environment",
        "development",
        "--branch",
        "my-feature-branch-123",
        "--force",
      ])
      .it("calls apiV1 archiveReusableRequest", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.archiveReusableRequest as sinon.SinonStub,
          sinon.match(
            ({ args, flags }) =>
              args.reusableRequestKey === "fetch-user" &&
              flags.environment === "development" &&
              flags.branch === "my-feature-branch-123",
          ),
        );
      });
  });

  describe("given --json", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "archiveReusableRequest", (stub) =>
        stub.resolves(factory.resp({ data: { result: "success" } })),
      )
      .stdout()
      .command([
        "reusable-request archive",
        "fetch-user",
        "--environment",
        "development",
        "--force",
        "--json",
      ])
      .it("prints the archive response", (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.deep.equal({ result: "success" });
      });
  });

  describe("given --json without --force", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "archiveReusableRequest", (stub) =>
        stub.resolves(factory.resp({ data: { result: "success" } })),
      )
      .stdout()
      .command([
        "reusable-request archive",
        "fetch-user",
        "--environment",
        "development",
        "--json",
      ])
      .it("does not archive", (ctx) => {
        const parsed = JSON.parse(ctx.stdout);
        expect(parsed.error.oclif.exit).to.equal(2);
        expect(parsed.result).to.equal(undefined);
        sinon.assert.notCalled(
          KnockApiV1.prototype.archiveReusableRequest as sinon.SinonStub,
        );
      });
  });

  describe("given confirmation prompt is declined", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "archiveReusableRequest", (stub) =>
        stub.resolves(factory.resp({ data: { result: "success" } })),
      )
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: false }),
      )
      .stdout()
      .command([
        "reusable-request archive",
        "fetch-user",
        "--environment",
        "development",
      ])
      .catch(/Archive cancelled/)
      .it("does not archive when declined", () => {
        sinon.assert.notCalled(
          KnockApiV1.prototype.archiveReusableRequest as sinon.SinonStub,
        );
      });
  });

  describe("given archive fails", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "archiveReusableRequest", (stub) =>
        stub.resolves(
          factory.resp({
            status: 404,
            data: {
              message: "The resource you requested does not exist",
            },
          }),
        ),
      )
      .stdout()
      .command([
        "reusable-request archive",
        "fetch-user",
        "--environment",
        "development",
        "--force",
      ])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });

  describe("given a local reusable request directory", () => {
    beforeEach(() => {
      fs.removeSync(sandboxDir);
      fs.ensureDirSync(sandboxDir);
      process.chdir(sandboxDir);
    });

    afterEach(() => {
      process.chdir(currCwd);
      fs.removeSync(sandboxDir);
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "archiveReusableRequest", (stub) =>
        stub.resolves(factory.resp({ data: { result: "success" } })),
      )
      .stdout()
      .do(() => {
        const dirPath = path.resolve(
          sandboxDir,
          "knock",
          "reusable-requests",
          "fetch-user",
        );
        fs.ensureDirSync(dirPath);
        fs.writeJsonSync(path.resolve(dirPath, "reusable_request.json"), {
          name: "Fetch user",
          type: "http_fetch",
        });
        fs.writeJsonSync(path.resolve(sandboxDir, "knock.json"), {
          knockDir: "knock",
        });
      })
      .command([
        "reusable-request archive",
        "fetch-user",
        "--environment",
        "development",
        "--force",
      ])
      .it("removes the local directory after archiving", (ctx) => {
        const dirPath = path.resolve(
          sandboxDir,
          "knock",
          "reusable-requests",
          "fetch-user",
        );
        expect(fs.pathExistsSync(dirPath)).to.equal(false);
        expect(ctx.stdout).to.include("Removed local directory");
      });
  });
});
