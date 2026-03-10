import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/audience/list", () => {
  const emptyAudiencesCursor = {
    entries: [],
    page_info: { after: undefined },
  };

  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAudiences", (stub) =>
        stub.resolves(emptyAudiencesCursor),
      )
      .stdout()
      .command(["audience list"])
      .it("calls apiV1 listAudiences with correct props", () => {
        const listStub = KnockApiV1.prototype.listAudiences as sinon.SinonStub;
        sinon.assert.calledWith(
          listStub,
          sinon.match({
            environment: "development",
          }),
        );
      });
  });

  describe("given flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAudiences", (stub) =>
        stub.resolves(emptyAudiencesCursor),
      )
      .stdout()
      .command([
        "audience list",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
        "--limit",
        "5",
        "--after",
        "xyz",
      ])
      .it("calls apiV1 listAudiences with correct props", () => {
        const listStub = KnockApiV1.prototype.listAudiences as sinon.SinonStub;
        sinon.assert.calledWith(
          listStub,
          sinon.match({
            environment: "staging",
            hide_uncommitted_changes: true,
            limit: 5,
            after: "xyz",
          }),
        );
      });
  });

  describe("given a branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAudiences", (stub) =>
        stub.resolves(emptyAudiencesCursor),
      )
      .stdout()
      .command(["audience list", "--branch", "my-feature-branch-123"])
      .it("calls apiV1 listAudiences with expected params", () => {
        const listStub = KnockApiV1.prototype.listAudiences as sinon.SinonStub;
        sinon.assert.calledWith(
          listStub,
          sinon.match({
            environment: "development",
            branch: "my-feature-branch-123",
          }),
        );
      });
  });

  describe("given a list of audiences in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAudiences", (stub) =>
        stub.resolves({
          entries: [
            factory.audience({ key: "audience-1" }),
            factory.audience({ key: "audience-2" }),
            factory.audience({ key: "audience-3" }),
          ],
          page_info: { after: undefined },
        }),
      )
      .stdout()
      .command(["audience list"])
      .it("displays the list of audiences", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 3 audiences in");
        expect(ctx.stdout).to.contain("audience-1");
        expect(ctx.stdout).to.contain("audience-2");
        expect(ctx.stdout).to.contain("audience-3");

        expect(ctx.stdout).to.not.contain("audience-4");
      });
  });

  describe("given the first page of paginated audiences in resp", () => {
    const paginatedAudiencesCursor = {
      entries: [
        factory.audience({ key: "audience-1" }),
        factory.audience({ key: "audience-2" }),
        factory.audience({ key: "audience-3" }),
      ],
      page_info: { after: "xyz" },
    };

    describe("plus a next page action from the prompt input", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listAudiences", (stub) =>
          stub.resolves(paginatedAudiencesCursor),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "n" })
            .onSecondCall()
            .resolves({ input: "" }),
        )
        .stdout()
        .command(["audience list"])
        .it(
          "calls apiV1 listAudiences for the second time with page params",
          () => {
            const listStub = KnockApiV1.prototype.listAudiences as sinon.SinonStub;

            sinon.assert.calledTwice(listStub);

            // First call without page params.
            sinon.assert.calledWith(
              listStub.firstCall,
              sinon.match({
                environment: "development",
              }),
            );

            // Second call with page params to fetch the next page.
            sinon.assert.calledWith(
              listStub.secondCall,
              sinon.match({
                environment: "development",
                after: "xyz",
              }),
            );
          },
        );
    });

    describe("plus a previous page action input from the prompt", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listAudiences", (stub) =>
          stub.resolves(paginatedAudiencesCursor),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "p" }),
        )
        .stdout()
        .command(["audience list"])
        .it("calls apiV1 listAudiences once for the initial page only", () => {
          const listStub = KnockApiV1.prototype.listAudiences as sinon.SinonStub;
          sinon.assert.calledOnce(listStub);
        });
    });
  });
});
