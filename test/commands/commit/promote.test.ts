import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

const setupWithStub = () =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "promoteAllChanges",
      sinon.stub().resolves(factory.resp({ data: "success" })),
    )
    .stub(
      enquirer.prototype,
      "prompt",
      sinon.stub().onFirstCall().resolves({ input: "y" }),
    );

const setupWithStubPromoteCommit = () =>
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "promoteChange",
      sinon.stub().resolves(
        factory.resp({
          data: { commit: factory.commit({ id: "example-id" }) },
        }),
      ),
    )
    .stub(
      enquirer.prototype,
      "prompt",
      sinon.stub().onFirstCall().resolves({ input: "y" }),
    );

describe("commands/commit/promote", () => {
  describe("given no `to` or `only` environment flag", () => {
    setupWithStub()
      .stdout()
      .command(["commit promote"])
      .catch((error) =>
        expect(error.message).to.match(
          /^You must specify either the `--to` or `--only` flag./,
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
          /^The flags `--to` and `--only` cannot be used together./,
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
  });

  describe("given an `only` commit ID flag", () => {
    setupWithStubPromoteCommit()
      .stdout()
      .command(["commit promote", "--only", "example-id"])
      .it("calls apiV1 promoteChange with expected props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.promoteChange as any,
          sinon.match(({ flags }) =>
            isEqual(flags, {
              "service-token": "valid-token",
              only: "example-id",
            }),
          ),
          sinon.match((commit) =>
            isEqual(commit, {
              id: "example-id",
            }),
          ),
        );
      });
  });
});
