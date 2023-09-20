import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/email_layout/list", () => {
  const emptyEmailLayoutsListResp = factory.resp({
    data: {
      page_info: factory.pageInfo(),
      entries: [],
    },
  });

  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(
        KnockApiV1.prototype,
        "listEmailLayouts",
        sinon.stub().resolves(emptyEmailLayoutsListResp),
      )
      .stdout()
      .command(["email_layout list"])
      .it("calls apiV1 listEmailLayouts with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listEmailLayouts as any,
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
});
