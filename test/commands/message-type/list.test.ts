import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/message-type/list", () => {
  const emptyEntriesResp = factory.resp({
    data: {
      page_info: factory.pageInfo(),
      entries: [],
    },
  });

  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listMessageTypes", (stub) =>
        stub.resolves(emptyEntriesResp),
      )
      .stdout()
      .command(["message-type list"])
      .it("calls apiV1 listMessageTypes with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listMessageTypes as any,
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

  describe("given a branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listMessageTypes", (stub) =>
        stub.resolves(emptyEntriesResp),
      )
      .stdout()
      .command(["message-type list", "--branch", "my-feature-branch-123"])
      .it("calls apiV1 listMessageTypes with expected params", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listMessageTypes as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
                branch: "my-feature-branch-123",
              }),
          ),
        );
      });
  });

  describe("given flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listMessageTypes", (stub) =>
        stub.resolves(emptyEntriesResp),
      )
      .stdout()
      .command([
        "message-type list",
        "--hide-uncommitted-changes",
        "--environment",
        "development",
        "--limit",
        "5",
        "--after",
        "xyz",
      ])
      .it("calls apiV1 listMessageTypes with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listMessageTypes as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {}) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "hide-uncommitted-changes": true,
                environment: "development",
                limit: 5,
                after: "xyz",
              }),
          ),
        );
      });
  });

  describe("given a list of message types in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listMessageTypes", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: [
                factory.messageType({ key: "card" }),
                factory.messageType({ key: "banner" }),
                factory.messageType({ key: "modal" }),
              ],
            },
          }),
        ),
      )
      .stdout()
      .command(["message-type list"])
      .it("displays the list of message types", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 3 in-app message types in");
        expect(ctx.stdout).to.contain("card");
        expect(ctx.stdout).to.contain("banner");
        expect(ctx.stdout).to.contain("modal");

        expect(ctx.stdout).to.not.contain("toast");
      });
  });

  describe("given the first page of paginated message types in resp", () => {
    const paginatedMessageTypesResp = factory.resp({
      data: {
        page_info: factory.pageInfo({
          after: "xyz",
        }),
        entries: [
          factory.messageType({ key: "card" }),
          factory.messageType({ key: "banner" }),
          factory.messageType({ key: "modal" }),
        ],
      },
    });

    describe("plus a next page action from the prompt input", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listMessageTypes", (stub) =>
          stub.resolves(paginatedMessageTypesResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "n" })
            .onSecondCall()
            .resolves({ input: "" }),
        )
        .stdout()
        .command(["message-type list"])
        .it(
          "calls apiV1 listMessageTypes for the second time with page params",
          () => {
            const listMessageTypesFn = KnockApiV1.prototype
              .listMessageTypes as any;

            sinon.assert.calledTwice(listMessageTypesFn);

            // First call without page params.
            sinon.assert.calledWith(
              listMessageTypesFn.firstCall,
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
              listMessageTypesFn.secondCall,
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
        .stub(KnockApiV1.prototype, "listMessageTypes", (stub) =>
          stub.resolves(paginatedMessageTypesResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.onFirstCall().resolves({ input: "p" }),
        )
        .stdout()
        .command(["message-type list"])
        .it(
          "calls apiV1 listMessageTypes once for the initial page only",
          () => {
            sinon.assert.calledOnce(
              KnockApiV1.prototype.listMessageTypes as any,
            );
          },
        );
    });
  });
});
