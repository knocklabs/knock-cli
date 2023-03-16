import { test } from "@oclif/test";
import enquirer from "enquirer";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/commit/index", () => {
  test
    .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
    .stub(
      KnockApiV1.prototype,
      "commitAllChanges",
      sinon.stub().resolves(factory.resp({ data: "success" })),
    )
    .stub(
      enquirer.prototype,
      "prompt",
      sinon.stub().onFirstCall().resolves({ input: "y" }),
    )
    .stdout()
    .command(["commit", "-m", "commit all the changes!"])
    .it("calls apiV1 commitAllChanges with expected props", () => {
      sinon.assert.calledWith(
        KnockApiV1.prototype.commitAllChanges as any,
        sinon.match(({ flags }) =>
          isEqual(flags, {
            "service-token": "valid-token",
            "api-origin": undefined,
            environment: "development",
            "commit-message": "commit all the changes!",
          }),
        ),
      );
    });
});
