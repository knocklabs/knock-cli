import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/reusable-request/archive", () => {
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
});
