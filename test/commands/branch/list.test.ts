import KnockMgmt from "@knocklabs/mgmt";
import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import { KnockEnv } from "@/lib/helpers/const";

describe("commands/branch/list", () => {
  const emptyBranchesListResp = {
    page_info: factory.pageInfo(),
    entries: [],
  };

  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Branches.prototype, "list", (stub) =>
        stub.resolves(emptyBranchesListResp),
      )
      .stdout()
      .command(["branch list"])
      .it("calls knockMgmt.branches.list with correct parameters", () => {
        sinon.assert.calledWith(KnockMgmt.Branches.prototype.list as any, {
          environment: KnockEnv.Development,
        });
      });
  });

  describe("given pagination flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Branches.prototype, "list", (stub) =>
        stub.resolves(emptyBranchesListResp),
      )
      .stdout()
      .command([
        "branch list",
        "--limit",
        "10",
        "--after",
        "xyz",
        "--before",
        "abc",
      ])
      .it("calls knockMgmt.branches.list with pagination parameters", () => {
        sinon.assert.calledWith(KnockMgmt.Branches.prototype.list as any, {
          environment: KnockEnv.Development,
          limit: 10,
          after: "xyz",
          before: "abc",
        });
      });
  });

  describe("given a list of branches in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Branches.prototype, "list", (stub) =>
        stub.resolves({
          page_info: factory.pageInfo(),
          entries: [
            factory.branch({ slug: "branch-1" }),
            factory.branch({ slug: "branch-2" }),
            factory.branch({ slug: "branch-3" }),
          ],
        }),
      )
      .stdout()
      .command(["branch list"])
      .it("displays the list of branches", (ctx) => {
        expect(ctx.stdout).to.contain(
          "Showing 3 branches off of the development environment",
        );
        expect(ctx.stdout).to.contain("branch-1");
        expect(ctx.stdout).to.contain("branch-2");
        expect(ctx.stdout).to.contain("branch-3");
        expect(ctx.stdout).to.not.contain("branch-4");
      });
  });

  describe("given the first page of paginated branches in response", () => {
    const paginatedBranchesResp = {
      page_info: factory.pageInfo({
        after: "xyz",
      }),
      entries: [
        factory.branch({ slug: "branch-1" }),
        factory.branch({ slug: "branch-2" }),
        factory.branch({ slug: "branch-3" }),
      ],
    };

    describe("plus a next page action from the prompt input", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockMgmt.Branches.prototype, "list", (stub) =>
          stub.resolves(paginatedBranchesResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "n" })
            .onSecondCall()
            .resolves({ input: "" }),
        )
        .stdout()
        .command(["branch list"])
        .it(
          "calls knockMgmt.branches.list for the second time with page params",
          () => {
            const branchesListStub = KnockMgmt.Branches.prototype.list as any;

            sinon.assert.calledTwice(branchesListStub);

            // First call without page params
            sinon.assert.calledWith(branchesListStub.firstCall, {
              environment: KnockEnv.Development,
            });

            // Second call with page params to fetch the next page
            sinon.assert.calledWith(branchesListStub.secondCall, {
              environment: KnockEnv.Development,
              after: "xyz",
            });
          },
        );
    });

    describe("plus a previous page action input from the prompt", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockMgmt.Branches.prototype, "list", (stub) =>
          stub.resolves(paginatedBranchesResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "p" }),
        )
        .stdout()
        .command(["branch list"])
        .it(
          "calls knockMgmt.branches.list once for the initial page only",
          () => {
            const branchesListStub = KnockMgmt.Branches.prototype.list as any;
            sinon.assert.calledOnce(branchesListStub);
          },
        );
    });
  });

  describe("given --json flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockMgmt.Branches.prototype, "list", (stub) =>
        stub.resolves({
          page_info: factory.pageInfo(),
          entries: [factory.branch({ slug: "test-branch" })],
        }),
      )
      .stdout()
      .command(["branch list", "--json"])
      .it("returns raw JSON response", (ctx) => {
        const output = JSON.parse(ctx.stdout);
        expect(output).to.have.property("page_info");
        expect(output).to.have.property("entries");
        expect(output.entries).to.have.length(1);
        expect(output.entries[0].slug).to.equal("test-branch");
      });
  });

  describe("given no service token", () => {
    test.command(["branch list"]).exit(2).it("exits with status 2");
  });
});
