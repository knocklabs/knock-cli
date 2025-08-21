import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/commit/list", () => {
  const emptyCommitListResp = factory.resp({
    data: {
      page_info: factory.pageInfo(),
      entries: [],
    },
  });

  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listCommits", (stub) =>
        stub.resolves(emptyCommitListResp),
      )
      .stdout()
      .command(["commit list"])
      .it("calls apiV1 listCommits with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listCommits as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
              }),
          ),
        );
      });
  });

  describe("given flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listCommits", (stub) =>
        stub.resolves(emptyCommitListResp),
      )
      .stdout()
      .command([
        "commit list",
        "--no-promoted",
        "--environment",
        "staging",
        "--limit",
        "5",
        "--after",
        "xyz",
        "--json",
        "--resource-type",
        "email_layout",
        "--resource-id",
        "123",
      ])
      .it("calls apiV1 listCommits with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listCommits as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                "service-token": "valid-token",
                promoted: false,
                environment: "staging",
                limit: 5,
                after: "xyz",
                json: true,
                "resource-type": "email_layout",
                "resource-id": "123",
              }),
          ),
        );
      });
  });

  describe("given a list of commit in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listCommits", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: [
                factory.commit({ id: "commit-1" }),
                factory.commit({ id: "commit-2" }),
                factory.commit({ id: "commit-3" }),
              ],
            },
          }),
        ),
      )
      .stdout()
      .command(["commit list"])
      .it("displays the list of commits", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 3 commits in");
        expect(ctx.stdout).to.contain("commit-1");
        expect(ctx.stdout).to.contain("commit-2");
        expect(ctx.stdout).to.contain("commit-3");
        expect(ctx.stdout).to.not.contain("commit-4");
      });
  });

  describe("given the first page of paginated commits in resp", () => {
    const paginatedCommitsResp = factory.resp({
      data: {
        page_info: factory.pageInfo({
          after: "xyz",
        }),
        entries: [
          factory.commit({ id: "commit-1" }),
          factory.commit({ id: "commit-2" }),
          factory.commit({ id: "commit-3" }),
        ],
      },
    });

    describe("plus a next page action from the prompt input", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listCommits", (stub) =>
          stub.resolves(paginatedCommitsResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "n" })
            .onSecondCall()
            .resolves({ input: "" }),
        )
        .stdout()
        .command(["commit list"])
        .it(
          "calls apiV1 listCommits for the second time with page params",
          () => {
            const listCommitsFn = KnockApiV1.prototype.listCommits as any;

            sinon.assert.calledTwice(listCommitsFn);

            // First call without page params.
            sinon.assert.calledWith(
              listCommitsFn.firstCall,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    "service-token": "valid-token",
                    environment: "development",
                  }),
              ),
            );

            // Second call with page params to fetch the next page.
            sinon.assert.calledWith(
              listCommitsFn.secondCall,
              sinon.match(
                ({ args, flags }) =>
                  isEqual(args, {}) &&
                  isEqual(flags, {
                    "service-token": "valid-token",
                    environment: "development",
                    after: "xyz",
                  }),
              ),
            );
          },
        );
    });

    describe("plus a previous page action input from the prompt", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listCommits", (stub) =>
          stub.resolves(paginatedCommitsResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "p" }),
        )
        .stdout()
        .command(["commit list"])
        .it("calls apiV1 listCommits once for the initial page only", () => {
          sinon.assert.calledOnce(KnockApiV1.prototype.listCommits as any);
        });
    });
  });

  describe("given a resource-type but not resource-id", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["commit list", "--resource-type", "email_layout"])
      .exit(2)
      .it("exits with status 2");

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .command(["commit list", "--resource-id", "123"])
      .exit(2)
      .it("exits with status 2");
  });
});
