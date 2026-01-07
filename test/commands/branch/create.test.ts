import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import BranchCreate from "@/commands/branch/create";

const TEST_SLUG = "test-branch";

describe("commands/branch/create", () => {
  const branchData = factory.branch({ slug: TEST_SLUG });

  describe("given a valid branch slug", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "post", (stub) => stub.resolves(branchData))
      .stdout()
      .command(["branch create", TEST_SLUG])
      .it("calls knockMgmt.post with correct parameters", () => {
        sinon.assert.calledWith(
          KnockMgmt.prototype.post as any,
          `/v1/branches/${TEST_SLUG}`,
        );
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "post", (stub) => stub.resolves(branchData))
      .stdout()
      .command(["branch create", TEST_SLUG])
      .it("displays success message with branch details", (ctx) => {
        expect(ctx.stdout).to.contain(
          `‣ Successfully created branch \`${TEST_SLUG}\``,
        );
        expect(ctx.stdout).to.contain(`Created at: ${branchData.created_at}`);
      });
  });

  describe("given a branch slug containing mixed casing and whitespace", () => {
    const expectedSlug = "mixed-case-with-whitespace";

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .stub(KnockMgmt.prototype, "post", (stub) =>
        stub.resolves(factory.branch({ slug: expectedSlug })),
      )
      .command(["branch create", " Mixed Case   With Whitespace "])
      .it("creates a branch with the correct slug", () => {
        sinon.assert.calledWith(
          KnockMgmt.prototype.post as any,
          `/v1/branches/${expectedSlug}`,
        );
      });
  });

  describe("given an invalid branch slug", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(
        // Attempts to pass in whitespace as the slug
        ["branch create", " "],
      )
      .catch(/Invalid slug provided/)
      .it("throws an error");
  });

  describe("given --json flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "post", (stub) => stub.resolves(branchData))
      .stdout()
      .command(["branch create", TEST_SLUG, "--json"])
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
      .command(["branch create", TEST_SLUG])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given no branch slug argument", () => {
    describe("when user provides slug via prompt", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockMgmt.prototype, "post", (stub) => stub.resolves(branchData))
        .stub(BranchCreate.prototype, "promptForBranchSlug", (stub) =>
          stub.resolves(TEST_SLUG),
        )
        .stdout()
        .command(["branch create"])
        .it("creates branch with prompted slug", (ctx) => {
          sinon.assert.calledWith(
            KnockMgmt.prototype.post as any,
            `/v1/branches/${TEST_SLUG}`,
          );
          expect(ctx.stdout).to.contain(
            `‣ Successfully created branch \`${TEST_SLUG}\``,
          );
        });
    });

    describe("when user provides slug with mixed casing via prompt", () => {
      const expectedSlug = "feature-my-awesome-feature";

      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockMgmt.prototype, "post", (stub) =>
          stub.resolves(factory.branch({ slug: expectedSlug })),
        )
        .stub(BranchCreate.prototype, "promptForBranchSlug", (stub) =>
          stub.resolves(expectedSlug),
        )
        .stdout()
        .command(["branch create"])
        .it("slugifies the prompted input", () => {
          sinon.assert.calledWith(
            KnockMgmt.prototype.post as any,
            `/v1/branches/${expectedSlug}`,
          );
        });
    });

    describe("when user cancels the prompt", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(BranchCreate.prototype, "promptForBranchSlug", (stub) =>
          stub.resolves(),
        )
        .command(["branch create"])
        .catch(/Invalid slug provided/)
        .it("throws an error");
    });
  });

  describe("given API error response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "post", (stub) =>
        stub.rejects(
          new KnockMgmt.APIError(
            422,
            {
              code: "invalid_params",
              errors: [
                {
                  field: "slug",
                  message: "An environment with this slug already exists",
                  type: null,
                },
              ],
              message: "One or more parameters supplied were invalid",
              status: 422,
              type: "invalid_request_error",
            },
            undefined,
            new Headers(),
          ),
        ),
      )
      .command(["branch create", TEST_SLUG])
      .catch(
        `One or more parameters supplied were invalid (status: 422)\n\n` +
          `  JsonDataError: data at "slug" An environment with this slug already exists`,
      )
      .it("throws an error for API errors");
  });
});
