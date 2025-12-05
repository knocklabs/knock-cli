// Don't ask me why, but importing this is necessary to stub KnockMgmt.prototype.delete
import "@/../test/support";

import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as sinon from "sinon";

import { KnockEnv } from "@/lib/helpers/const";

describe("commands/branch/merge", () => {
  describe("given confirmation accepted for both promote and delete", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Commits.prototype, "promoteAll", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stub(KnockMgmt.Branches.prototype, "delete", (stub) => stub.resolves())
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: "y" }),
      )
      .stdout()
      .command(["branch merge", "test-branch"])
      .it(
        "calls promoteAll and delete with correct parameters and shows success messages",
        (ctx) => {
          sinon.assert.calledWith(
            KnockMgmt.Commits.prototype.promoteAll as any,
            {
              branch: "test-branch",
              to_environment: KnockEnv.Development,
            },
          );
          sinon.assert.calledWith(
            KnockMgmt.Branches.prototype.delete as any,
            "test-branch",
            { environment: KnockEnv.Development },
          );
          expect(ctx.stdout).to.contain(
            "Successfully merged all changes into the development environment",
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
      .stub(KnockMgmt.Commits.prototype, "promoteAll", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stub(KnockMgmt.Branches.prototype, "delete", (stub) => stub.resolves())
      .stdout()
      .command(["branch merge", "test-branch", "--force"])
      .it(
        "calls promoteAll and delete without prompting for confirmation",
        (ctx) => {
          sinon.assert.calledWith(
            KnockMgmt.Commits.prototype.promoteAll as any,
            {
              branch: "test-branch",
              to_environment: KnockEnv.Development,
            },
          );
          sinon.assert.calledWith(
            KnockMgmt.Branches.prototype.delete as any,
            "test-branch",
            { environment: KnockEnv.Development },
          );
          expect(ctx.stdout).to.contain(
            "Successfully merged all changes into the development environment",
          );
          expect(ctx.stdout).to.contain(
            "Successfully deleted branch `test-branch`",
          );
        },
      );
  });

  describe("given --skip-deletion flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Commits.prototype, "promoteAll", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stub(KnockMgmt.Branches.prototype, "delete", (stub) => stub.resolves())
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: "y" }),
      )
      .stdout()
      .command(["branch merge", "test-branch", "--skip-deletion"])
      .it(
        "calls promoteAll but skips branch deletion and does not show deletion success message",
        (ctx) => {
          sinon.assert.calledWith(
            KnockMgmt.Commits.prototype.promoteAll as any,
            {
              branch: "test-branch",
              to_environment: KnockEnv.Development,
            },
          );
          sinon.assert.notCalled(KnockMgmt.Branches.prototype.delete as any);
          expect(ctx.stdout).to.contain(
            "Successfully merged all changes into the development environment",
          );
          expect(ctx.stdout).to.not.contain("Successfully deleted branch");
        },
      );
  });

  describe("given confirmation declined for promote", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Commits.prototype, "promoteAll", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stub(KnockMgmt.Branches.prototype, "delete", (stub) => stub.resolves())
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: false }),
      )
      .stdout()
      .command(["branch merge", "test-branch"])
      .it(
        "does not call promoteAll or delete and shows no success messages",
        (ctx) => {
          sinon.assert.notCalled(KnockMgmt.Commits.prototype.promoteAll as any);
          sinon.assert.notCalled(KnockMgmt.Branches.prototype.delete as any);
          expect(ctx.stdout).to.not.contain("Successfully merged all changes");
          expect(ctx.stdout).to.not.contain("Successfully deleted branch");
        },
      );
  });

  describe("given confirmation accepted for promote but declined for delete", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Commits.prototype, "promoteAll", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stub(KnockMgmt.Branches.prototype, "delete", (stub) => stub.resolves())
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub
          .onFirstCall()
          .resolves({ input: "y" })
          .onSecondCall()
          .resolves({ input: false }),
      )
      .stdout()
      .command(["branch merge", "test-branch"])
      .it(
        "calls promoteAll but not delete and only shows merge success message",
        (ctx) => {
          sinon.assert.calledWith(
            KnockMgmt.Commits.prototype.promoteAll as any,
            {
              branch: "test-branch",
              to_environment: KnockEnv.Development,
            },
          );
          sinon.assert.notCalled(KnockMgmt.Branches.prototype.delete as any);
          expect(ctx.stdout).to.contain(
            "Successfully merged all changes into the development environment",
          );
          expect(ctx.stdout).to.not.contain("Successfully deleted branch");
        },
      );
  });

  describe("given an argument containing mixed casing and whitespace", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Commits.prototype, "promoteAll", (stub) =>
        stub.resolves({ result: "success" }),
      )
      .stub(KnockMgmt.Branches.prototype, "delete", (stub) => stub.resolves())
      .command(["branch merge", " Mixed Case   With Whitespace ", "--force"])
      .it("slugifies input before calling promoteAll and delete", () => {
        sinon.assert.calledWith(KnockMgmt.Commits.prototype.promoteAll as any, {
          branch: "mixed-case-with-whitespace",
          to_environment: KnockEnv.Development,
        });
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
        ["branch merge", " "],
      )
      .catch(/Invalid slug provided/)
      .it("throws an error");
  });

  describe("given no service token", () => {
    test
      .command(["branch merge", "test-branch"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given API error on promote", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Commits.prototype, "promoteAll", (stub) =>
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
      .command(["branch merge", "nonexistent-branch"])
      .catch(
        /The branch you specified was not found in this project \(status: 404\)/,
      )
      .it("throws error when API returns error during promote");
  });

  describe("given API error on delete", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Commits.prototype, "promoteAll", (stub) =>
        stub.resolves({ result: "success" }),
      )
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
      .command(["branch merge", "nonexistent-branch"])
      .catch(
        /The branch you specified was not found in this project \(status: 404\)/,
      )
      .it("throws error when API returns error during delete");
  });
});
