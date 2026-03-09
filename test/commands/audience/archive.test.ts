import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/audience/archive", () => {
  describe("given no audience key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["audience archive", "--environment", "development"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given no environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["audience archive", "vip-users"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given an audience key arg with --force flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "archiveAudience", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.audience({ key: "vip-users" }),
          }),
        ),
      )
      .stdout()
      .command([
        "audience archive",
        "vip-users",
        "--environment",
        "development",
        "--force",
      ])
      .it("calls apiV1 archiveAudience with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.archiveAudience as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                audienceKey: "vip-users",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                force: true,
              }),
          ),
        );
      });
  });

  describe("given confirmation prompt is declined", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "archiveAudience", (stub) =>
        stub.resolves(factory.resp({ data: factory.audience() })),
      )
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: false }),
      )
      .stdout()
      .command([
        "audience archive",
        "vip-users",
        "--environment",
        "development",
      ])
      .it("does not call archiveAudience when declined", (ctx) => {
        expect(ctx.stdout).to.contain("Archive cancelled");
        sinon.assert.notCalled(KnockApiV1.prototype.archiveAudience as any);
      });
  });

  describe("given archive fails", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "archiveAudience", (stub) =>
        stub.resolves(
          factory.resp({
            status: 404,
            statusText: "Not found",
            data: {
              code: "resource_missing",
              message: "The resource you requested does not exist",
              status: 404,
              type: "api_error",
            },
          }),
        ),
      )
      .stdout()
      .command([
        "audience archive",
        "vip-users",
        "--environment",
        "development",
        "--force",
      ])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });
});
