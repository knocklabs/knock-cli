import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

const emptyResp = () =>
  factory.resp({
    data: {
      entries: [],
      page_info: factory.pageInfo(),
    },
  });

describe("commands/reusable-request/list", () => {
  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listReusableRequests", (stub) =>
        stub.resolves(emptyResp()),
      )
      .stdout()
      .command(["reusable-request list"])
      .it("calls apiV1 listReusableRequests with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listReusableRequests as sinon.SinonStub,
          sinon.match(
            ({ flags }) =>
              flags["service-token"] === "valid-token" &&
              flags.environment === undefined,
          ),
        );
      });
  });

  describe("given flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listReusableRequests", (stub) =>
        stub.resolves(emptyResp()),
      )
      .stdout()
      .command([
        "reusable-request list",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
        "--branch",
        "my-feature-branch-123",
        "--limit",
        "5",
        "--after",
        "xyz",
      ])
      .it("calls apiV1 listReusableRequests with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listReusableRequests as sinon.SinonStub,
          sinon.match(({ flags }) =>
            isEqual(
              {
                environment: flags.environment,
                branch: flags.branch,
                "hide-uncommitted-changes": flags["hide-uncommitted-changes"],
                limit: flags.limit,
                after: flags.after,
              },
              {
                environment: "staging",
                branch: "my-feature-branch-123",
                "hide-uncommitted-changes": true,
                limit: 5,
                after: "xyz",
              },
            ),
          ),
        );
      });
  });

  describe("given a list of reusable requests in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listReusableRequests", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              entries: [
                factory.reusableRequest({ key: "fetch-user" }),
                factory.reusableRequest({ key: "fetch-org" }),
              ],
              page_info: factory.pageInfo(),
            },
          }),
        ),
      )
      .stdout()
      .command(["reusable-request list"])
      .it("displays the list of reusable requests", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 2 reusable requests in");
        expect(ctx.stdout).to.contain("fetch-user");
        expect(ctx.stdout).to.contain("fetch-org");
        expect(ctx.stdout).to.contain("http_fetch");
      });
  });

  describe("given --json", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listReusableRequests", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              entries: [factory.reusableRequest()],
              page_info: factory.pageInfo(),
            },
          }),
        ),
      )
      .stdout()
      .command(["reusable-request list", "--json"])
      .it("prints the paginated response", (ctx) => {
        const parsed = JSON.parse(ctx.stdout);
        expect(parsed.entries[0].key).to.equal("fetch-user");
        expect(parsed.page_info.page_size).to.equal(50);
      });
  });

  describe("given the first page of paginated reusable requests", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listReusableRequests", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              entries: [factory.reusableRequest()],
              page_info: factory.pageInfo({ after: "xyz" }),
            },
          }),
        ),
      )
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub
          .onFirstCall()
          .resolves({ input: "n" })
          .onSecondCall()
          .resolves({ input: "" }),
      )
      .stdout()
      .command(["reusable-request list"])
      .it("fetches the next page", () => {
        const listStub = KnockApiV1.prototype
          .listReusableRequests as sinon.SinonStub;

        sinon.assert.calledTwice(listStub);
        sinon.assert.calledWith(
          listStub.secondCall,
          sinon.match(({ flags }) => flags.after === "xyz"),
        );
      });
  });
});
