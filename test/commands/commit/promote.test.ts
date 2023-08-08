import { test } from "@oclif/test";
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

describe("commands/commit/promote", () => {
  describe("given no `to` environment flag", () => {
    setupWithStub()
      .stdout()
      .command(["commit promote"])
      .exit(2)
      .it("exists with status 2");
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
});
