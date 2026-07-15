import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { KnockEnv } from "@/lib/helpers/const";

const TEST_SLUG = "test-branch";

describe("commands/branch/rebase", () => {
  const branchData = factory.branch({ slug: TEST_SLUG });

  describe("given confirmation accepted", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "rebaseBranch", (stub) =>
        stub.resolves(factory.resp({ data: branchData })),
      )
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: "y" }),
      )
      .stdout()
      .command(["branch rebase", TEST_SLUG])
      .it(
        "calls apiV1.rebaseBranch with correct parameters and shows success message",
        (ctx) => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.rebaseBranch as any,
            TEST_SLUG,
            KnockEnv.Development,
          );
          expect(ctx.stdout).to.contain(
            `‣ Successfully rebased branch \`${TEST_SLUG}\``,
          );
          expect(ctx.stdout).to.contain(`Updated at: ${branchData.updated_at}`);
        },
      );
  });

  describe("given --force flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "rebaseBranch", (stub) =>
        stub.resolves(factory.resp({ data: branchData })),
      )
      .stdout()
      .command(["branch rebase", TEST_SLUG, "--force"])
      .it(
        "calls apiV1.rebaseBranch without prompting for confirmation",
        (ctx) => {
          sinon.assert.calledWith(
            KnockApiV1.prototype.rebaseBranch as any,
            TEST_SLUG,
            KnockEnv.Development,
          );
          expect(ctx.stdout).to.contain(
            `‣ Successfully rebased branch \`${TEST_SLUG}\``,
          );
        },
      );
  });

  describe("given confirmation declined", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "rebaseBranch", (stub) =>
        stub.resolves(factory.resp({ data: branchData })),
      )
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: false }),
      )
      .stdout()
      .command(["branch rebase", TEST_SLUG])
      .it(
        "does not call apiV1.rebaseBranch and shows no success message",
        (ctx) => {
          sinon.assert.notCalled(KnockApiV1.prototype.rebaseBranch as any);
          expect(ctx.stdout).to.not.contain("Successfully rebased branch");
        },
      );
  });

  describe("given an argument containing mixed casing and whitespace", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "rebaseBranch", (stub) =>
        stub.resolves(factory.resp({ data: branchData })),
      )
      .command(["branch rebase", " Mixed Case   With Whitespace ", "--force"])
      .it("slugifies input before calling apiV1.rebaseBranch", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.rebaseBranch as any,
          "mixed-case-with-whitespace",
          KnockEnv.Development,
        );
      });
  });

  describe("given an invalid branch slug", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["branch rebase", " "])
      .catch(/Invalid slug provided/)
      .it("throws an error");
  });

  describe("given --json flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "rebaseBranch", (stub) =>
        stub.resolves(factory.resp({ data: branchData })),
      )
      .stdout()
      .command(["branch rebase", TEST_SLUG, "--force", "--json"])
      .it("returns raw JSON response", (ctx) => {
        const output = JSON.parse(ctx.stdout);
        expect(output).to.have.property("slug", TEST_SLUG);
        expect(output).to.have.property("created_at", branchData.created_at);
        expect(output).to.have.property("updated_at", branchData.updated_at);
        expect(output).to.have.property(
          "last_commit_at",
          branchData.last_commit_at,
        );
        expect(output).to.have.property("deleted_at", branchData.deleted_at);
      });
  });

  describe("given no service token", () => {
    test
      .command(["branch rebase", TEST_SLUG])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given API error", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "rebaseBranch", (stub) =>
        stub.resolves(
          factory.resp({
            status: 404,
            data: {
              code: "branch_not_found",
              message: "The branch you specified was not found in this project",
              status: 404,
              type: "invalid_request_error",
            },
          }),
        ),
      )
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: "y" }),
      )
      .command(["branch rebase", "nonexistent-branch"])
      .catch(/The branch you specified was not found in this project/)
      .it("throws error when API returns branch_not_found");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "rebaseBranch", (stub) =>
        stub.resolves(
          factory.resp({
            status: 422,
            data: {
              code: "branch_rebase_blocked",
              message:
                'Commit or discard unpublished changes on shared resources before rebasing. Blocking resources: workflow "Shared"',
              status: 422,
              type: "invalid_request_error",
            },
          }),
        ),
      )
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ input: "y" }),
      )
      .command(["branch rebase", TEST_SLUG])
      .catch(
        /Commit or discard unpublished changes on shared resources before rebasing/,
      )
      .it("throws error when API returns branch_rebase_blocked");
  });
});
