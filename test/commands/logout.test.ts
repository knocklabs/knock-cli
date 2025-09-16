import { expect, test } from "@oclif/test";
import * as sinon from "sinon";

import { UserConfigStore } from "@/lib/user-config";

describe("commands/logout", () => {
  test
    .stdout()
    .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
    .command(["logout"])
    .it("logs out the user", (ctx) => {
      sinon.assert.calledWith(UserConfigStore.prototype.set as any, {
        userSession: undefined,
      });

      expect(ctx.stdout).to.contain(
        "Successfully logged out of Knock. See you around.",
      );
    });
});
