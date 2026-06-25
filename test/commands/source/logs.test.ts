import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/source/logs", () => {
  const emptyLogsResp = factory.resp({
    data: {
      page_info: factory.pageInfo(),
      entries: [],
    },
  });

  describe("given no source key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["source logs"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a source key arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listSourceLogs", (stub) =>
        stub.resolves(emptyLogsResp),
      )
      .stdout()
      .command(["source logs", "my-source"])
      .it("calls apiV1 listSourceLogs with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listSourceLogs as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { sourceKey: "my-source" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
              }),
          ),
        );
      });
  });

  describe("given filter and pagination flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listSourceLogs", (stub) =>
        stub.resolves(emptyLogsResp),
      )
      .stdout()
      .command([
        "source logs",
        "my-source",
        "--environment",
        "staging",
        "--event",
        "invoice.created",
        "--id",
        "log_123",
        "--date",
        "2024-01-15",
        "--starting-at",
        "2024-01-15T00:00:00Z",
        "--ending-at",
        "2024-01-15T23:59:59Z",
        "--limit",
        "10",
      ])
      .it("calls apiV1 listSourceLogs with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listSourceLogs as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { sourceKey: "my-source" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "staging",
                event: "invoice.created",
                id: "log_123",
                date: "2024-01-15",
                "starting-at": "2024-01-15T00:00:00Z",
                "ending-at": "2024-01-15T23:59:59Z",
                limit: 10,
              }),
          ),
        );
      });
  });

  describe("given an invalid --starting-at value", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["source logs", "my-source", "--starting-at", "not-a-date"])
      .catch((error) =>
        expect(error.message).to.contain("not a valid ISO-8601"),
      )
      .it("rejects the flag value");
  });

  describe("given a list of logs in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listSourceLogs", (stub) =>
        stub.resolves(
          factory.resp({
            data: {
              page_info: factory.pageInfo(),
              entries: [
                factory.sourceLog({ id: "log-1" }),
                factory.sourceLog({ id: "log-2" }),
              ],
            },
          }),
        ),
      )
      .stdout()
      .command(["source logs", "my-source"])
      .it("displays the list of logs", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 2 logs for source `my-source`");
        expect(ctx.stdout).to.contain("log-1");
        expect(ctx.stdout).to.contain("log-2");
      });
  });

  describe("given the first page of paginated logs in resp", () => {
    const paginatedLogsResp = factory.resp({
      data: {
        page_info: factory.pageInfo({ after: "xyz" }),
        entries: [factory.sourceLog({ id: "log-1" })],
      },
    });

    describe("plus a next page action from the prompt input", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stub(KnockApiV1.prototype, "listSourceLogs", (stub) =>
          stub.resolves(paginatedLogsResp),
        )
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub
            .onFirstCall()
            .resolves({ input: "n" })
            .onSecondCall()
            .resolves({ input: "" }),
        )
        .stdout()
        .command(["source logs", "my-source"])
        .it("calls apiV1 listSourceLogs a second time with page params", () => {
          const fn = KnockApiV1.prototype.listSourceLogs as any;

          sinon.assert.calledTwice(fn);

          sinon.assert.calledWith(
            fn.secondCall,
            sinon.match(
              ({ args, flags }) =>
                isEqual(args, { sourceKey: "my-source" }) &&
                isEqual(flags, {
                  "service-token": "valid-token",
                  environment: "development",
                  after: "xyz",
                }),
            ),
          );
        });
    });
  });
});
