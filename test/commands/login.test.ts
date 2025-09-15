import { expect, test } from "@oclif/test";
import * as sinon from "sinon";

import auth from "@/lib/auth";
import { UserConfigStore } from "@/lib/user-config";

const mockAuthenticatedSession = {
  accessToken: "test-access-token",
  refreshToken: "test-refresh-token",
  idToken: "test-id-token",
  expiresAt: new Date(Date.now() + 3600 * 1000),
  clientId: "test-client-id",
};

describe("commands/login", () => {
  describe("given a service token flag", () => {
    test
      .stdout()
      .command(["login", "--service-token", "test-token"])
      .it("skips authentication when service token is provided", (ctx) => {
        expect(ctx.stdout).to.contain(
          "Service token provided, skipping login.",
        );
      });
  });

  describe("when the command is invoked without a service token", () => {
    test
      .stdout()
      .stub(auth, "waitForAccessToken", (stub) =>
        stub.resolves(mockAuthenticatedSession),
      )
      .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
      .command(["login"])
      .it("authenticates with Knock and stores the session", (ctx) => {
        sinon.assert.calledWith(UserConfigStore.prototype.set as any, {
          userSession: mockAuthenticatedSession,
        });

        expect(ctx.stdout).to.contain("Successfully authenticated with Knock.");
      });
  });
});
