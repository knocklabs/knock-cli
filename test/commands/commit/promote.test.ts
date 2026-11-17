import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

const setupWithStub = () =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "promoteAllChanges", (stub) =>
      stub.resolves(factory.resp({ data: "success" })),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

const promoteGroup = {
  id: "promote-group-id",
  commit_count: 2,
  created_at: "2026-01-01T00:00:00Z",
  source: "development",
  source_type: "environment",
  to_environment: "staging",
};

const setupWithStubPromoteAll = (promote_group: unknown) =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "promoteAllChanges", (stub) =>
      stub.resolves(
        factory.resp({ data: { result: "success", promote_group } }),
      ),
    );

const setupWithStubPromoteCommit = () =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(KnockApiV1.prototype, "promoteOneChange", (stub) =>
      stub.resolves(
        factory.resp({
          data: {
            commit: factory.commit({ id: "example-id" }),
            promote_group: promoteGroup,
          },
        }),
      ),
    )
    .stub(enquirer.prototype, "prompt", (stub) =>
      stub.onFirstCall().resolves({ input: "y" }),
    );

describe("commands/commit/promote", () => {
  describe("given no `to` or `only` environment flag", () => {
    setupWithStub()
      .stdout()
      .command(["commit promote"])
      .catch((error) =>
        expect(error.message).to.match(
          /^You must specify either `--to` or `--only` flag./,
        ),
      )
      .it("throws an error");
  });

  describe("given both `to` and `only` flags,", () => {
    setupWithStub()
      .stdout()
      .command(["commit promote", "--to", "staging", "--only", "example-id"])
      .catch((error) =>
        expect(error.message).to.match(
          /^`--to` and `--only` flags cannot be used together./,
        ),
      )
      .it("throws an error");
  });

  describe("given a target `to` environment flag", () => {
    setupWithStub()
      .stdout()
      .command(["commit promote", "--to", "staging"])
      .it("calls apiV1 promoteAllChanges with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.promoteAllChanges as any,
          sinon.match(({ flags }) =>
            isEqual(flags, {
              "service-token": "valid-token",

              to: "staging",
            }),
          ),
        );
      });

    setupWithStubPromoteAll(promoteGroup)
      .stdout()
      .command(["commit promote", "--to", "staging", "--force"])
      .it("prints the promote group id", (ctx) => {
        expect(ctx.stdout).to.contain("Successfully promoted all changes");
        expect(ctx.stdout).to.contain("Promote group id: promote-group-id");
      });

    setupWithStubPromoteAll(null)
      .stdout()
      .command(["commit promote", "--to", "staging", "--force"])
      .it("omits the promote group id when nothing was promoted", (ctx) => {
        expect(ctx.stdout).to.contain("Successfully promoted all changes");
        expect(ctx.stdout).to.not.contain("Promote group id");
      });
  });

  describe("given an `only` commit ID flag", () => {
    setupWithStubPromoteCommit()
      .stdout()
      .command(["commit promote", "--only", "example-id"])
      .it("calls apiV1 promoteOneChange with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.promoteOneChange as any,
          sinon.match(({ flags }) =>
            isEqual(flags, {
              "service-token": "valid-token",
              only: "example-id",
            }),
          ),
        );
      });

    setupWithStubPromoteCommit()
      .stdout()
      .command(["commit promote", "--only", "example-id", "--force"])
      .it("prints the commit id and promote group id", (ctx) => {
        expect(ctx.stdout).to.contain("Commit id: example-id");
        expect(ctx.stdout).to.contain("Promote group id: promote-group-id");
      });
  });
});
