import { test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/broadcast/list", () => {
  describe("given no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listBroadcasts", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.paginatedResp([factory.broadcast()]),
          }),
        ),
      )
      .stdout()
      .command(["broadcast list"])
      .it("calls apiV1 listBroadcasts with correct params", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.listBroadcasts as any,
          sinon.match(
            ({ flags }) =>
              isEqual(flags.environment, "development") &&
              isEqual(flags["service-token"], "valid-token"),
          ),
        );
      });
  });
});
