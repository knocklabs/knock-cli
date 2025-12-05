// Don't ask me why, but importing this is necessary to stub KnockMgmt.prototype.delete
import "@/../test/support";

import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as sinon from "sinon";

import { KnockEnv } from "@/lib/helpers/const";

describe("commands/branch/delete", () => {
  describe("given confirmation accepted", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Branches.prototype, "delete", (stub) => stub.resolves())
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: "y" }),
      )
      .stdout()
      .command(["branch delete", "test-branch"])
      .it(
        "calls knockMgmt.delete with correct parameters and shows success message",
        (ctx) => {
          sinon.assert.calledWith(
            KnockMgmt.Branches.prototype.delete as any,
            "test-branch",
            { environment: KnockEnv.Development },
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
      .stub(KnockMgmt.Branches.prototype, "delete", (stub) => stub.resolves())
      .stdout()
      .command(["branch delete", "test-branch", "--force"])
      .it(
        "calls knockMgmt.delete without prompting for confirmation",
        (ctx) => {
          sinon.assert.calledWith(
            KnockMgmt.Branches.prototype.delete as any,
            "test-branch",
            { environment: KnockEnv.Development },
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
      .stub(KnockMgmt.Branches.prototype, "delete", (stub) => stub.resolves())
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: false }),
      )
      .stdout()
      .command(["branch delete", "test-branch"])
      .it(
        "does not call knockMgmt.delete and shows no success message",
        (ctx) => {
          sinon.assert.notCalled(KnockMgmt.Branches.prototype.delete as any);
          expect(ctx.stdout).to.not.contain("Successfully deleted branch");
        },
      );
  });

  describe("given an argument containing mixed casing and whitespace", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Branches.prototype, "delete", (stub) => stub.resolves())
      .command(["branch delete", " Mixed Case   With Whitespace ", "--force"])
      .it("slugifies input before calling knockMgmt.delete", () => {
        sinon.assert.calledWith(
          KnockMgmt.Branches.prototype.delete as any,
          "mixed-case-with-whitespace",
          { environment: KnockEnv.Development },
        );
      });
  });

  describe("given an invalid branch slug", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(
        // Attempts to pass in whitespace as the slug
        ["branch delete", " "],
      )
      .catch(/Invalid slug provided/)
      .it("throws an error");
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
      .stub(KnockMgmt.Branches.prototype, "delete", (stub) =>
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
