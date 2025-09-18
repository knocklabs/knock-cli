import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as sinon from "sinon";

describe("commands/branch/delete", () => {
  describe("given confirmation accepted", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "delete", (stub) => stub.resolves())
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: "y" }),
      )
      .stdout()
      .command(["branch delete", "test-branch"])
      .it(
        "calls knockMgmt.delete with correct parameters and shows success message",
        (ctx) => {
          sinon.assert.calledWith(
            KnockMgmt.prototype.delete as any,
            "/v1/branches/test-branch",
          );
          expect(ctx.stdout).to.contain(
            "Successfully deleted branch `test-branch`",
          );
        },
      );
  });

  describe("given --force flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "delete", (stub) => stub.resolves())
      .stdout()
      .command(["branch delete", "test-branch", "--force"])
      .it(
        "calls knockMgmt.delete without prompting for confirmation",
        (ctx) => {
          sinon.assert.calledWith(
            KnockMgmt.prototype.delete as any,
            "/v1/branches/test-branch",
          );
          expect(ctx.stdout).to.contain(
            "Successfully deleted branch `test-branch`",
          );
        },
      );
  });

  describe("given confirmation declined", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "delete", (stub) => stub.resolves())
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: false }),
      )
      .stdout()
      .command(["branch delete", "test-branch"])
      .it(
        "does not call knockMgmt.delete and shows no success message",
        (ctx) => {
          sinon.assert.notCalled(KnockMgmt.prototype.delete as any);
          expect(ctx.stdout).to.not.contain("Successfully deleted branch");
        },
      );
  });

  describe("given no service token", () => {
    test
      .command(["branch delete", "test-branch"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given API error", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "delete", (stub) =>
        stub.rejects(
          new KnockMgmt.APIError(
            404,
            {
              code: "branch_not_found",
              message: "The branch you specified was not found in this project",
              status: 404,
              type: "invalid_request_error",
            },
            undefined,
            new Headers(),
          ),
        ),
      )
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: "y" }),
      )
      .command(["branch delete", "nonexistent-branch"])
      .catch(
        /The branch you specified was not found in this project \(status: 404\)/,
      )
      .it("throws error when API returns error");
  });
});
