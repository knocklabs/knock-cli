import * as path from "node:path";

import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import * as fs from "fs-extra";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import { BRANCH_FILE_NAME } from "@/lib/helpers/branch";
import { sandboxDir } from "@/lib/helpers/const";

const branchFilePath = path.resolve(sandboxDir, BRANCH_FILE_NAME);

describe("commands/branch/switch", () => {
  beforeEach(() => {
    fs.ensureFileSync(branchFilePath);
    process.chdir(sandboxDir);
  });

  afterEach(() => {
    fs.removeSync(sandboxDir);
  });

  describe("given a valid branch slug", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "get", (stub) =>
        stub.resolves(factory.branch({ slug: "my-feature-branch-123" })),
      )
      .stdout()
      .command(["branch switch", "my-feature-branch-123"])
      .it(
        "fetches branch, updates .knock_current_branch file, and displays success message",
        (ctx) => {
          sinon.assert.calledWith(
            KnockMgmt.prototype.get as any,
            "/v1/branches/my-feature-branch-123",
          );

          expect(fs.readFileSync(branchFilePath, "utf-8")).to.equal(
            "my-feature-branch-123\n",
          );

          expect(ctx.stdout).to.contain(
            "‣ Successfully switched to branch `my-feature-branch-123`",
          );
        },
      );
  });

  describe("given an argument containing mixed casing and whitespace", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "get", (stub) =>
        stub.resolves(factory.branch()),
      )
      .command(["branch switch", " Mixed Case   With Whitespace "])
      .it("slugifies input before fetching branch", () => {
        sinon.assert.calledWith(
          KnockMgmt.prototype.get as any,
          "/v1/branches/mixed-case-with-whitespace",
        );
      });
  });

  describe("given an invalid branch slug", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(
        // Attempts to pass in whitespace as the slug
        ["branch switch", " "],
      )
      .catch(/Invalid slug provided/)
      .it("throws an error");
  });

  describe("given no service token", () => {
    test
      .command(["branch switch", "test-branch"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given API error", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.prototype, "get", (stub) =>
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
      .command(["branch switch", "nonexistent-branch"])
      .catch(
        /The branch you specified was not found in this project \(status: 404\)/,
      )
      .it("throws error when API returns error");
  });
});
