import { Auth, type AuthVerifyResponse } from "@knocklabs/mgmt/resources/auth";
import { expect, test } from "@oclif/test";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import auth from "@/lib/auth";
import { DEFAULT_AUTH_URL } from "@/lib/urls";
import { UserConfigStore } from "@/lib/user-config";

const mockAuthenticatedSession = factory.authenticatedSession();

describe("commands/whoami", () => {
  const serviceTokenData: AuthVerifyResponse = {
    type: "service_token",
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: "My cool token",
    user_id: null,
  };

  const userData: AuthVerifyResponse = {
    type: "oauth_context",
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: null,
    user_id: "123",
  };

  describe("given a valid service token via flag", () => {
    test
      .stub(Auth.prototype, "verify", (stub) => stub.resolves(serviceTokenData))
      .stdout()
      .command(["whoami", "--service-token", "valid-token"])
      .it("runs the command to make a whoami request", (ctx) => {
        expect(ctx.stdout).to.contain("Account name: Collab.io");
        expect(ctx.stdout).to.contain("Service token name: My cool token");
      });
  });

  describe("given a valid service token via env var", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(Auth.prototype, "verify", (stub) => stub.resolves(serviceTokenData))
      .stdout()
      .command(["whoami"])
      .it("runs the command to make a whoami request", (ctx) => {
        expect(ctx.stdout).to.contain("Account name: Collab.io");
        expect(ctx.stdout).to.contain("Service token name: My cool token");
      });
  });

  describe("given a valid service token via user config", () => {
    test
      .stub(UserConfigStore.prototype, "get", (stub) =>
        stub.returns({ serviceToken: "valid-token" }),
      )
      .stub(Auth.prototype, "verify", (stub) => stub.resolves(serviceTokenData))
      .stdout()
      .command(["whoami"])
      .it("runs the command to make a whoami request", (ctx) => {
        expect(ctx.stdout).to.contain("Account name: Collab.io");
        expect(ctx.stdout).to.contain("Service token name: My cool token");
      });
  });

  describe("given a valid user session via user config", () => {
    test
      .stub(UserConfigStore.prototype, "get", (stub) =>
        stub.returns({ userSession: mockAuthenticatedSession }),
      )
      .stub(Auth.prototype, "verify", (stub) => stub.resolves(userData))
      .stub(auth, "refreshAccessToken", (stub) =>
        stub.resolves(mockAuthenticatedSession),
      )
      .stdout()
      .command(["whoami"])
      .it("runs the command to make a whoami request", (ctx) => {
        expect(ctx.stdout).to.contain("Account name: Collab.io");
        expect(ctx.stdout).to.contain("User ID: 123");
      });

    test
      .stub(UserConfigStore.prototype, "get", (stub) =>
        stub.returns({ userSession: mockAuthenticatedSession }),
      )
      .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
      .stub(Auth.prototype, "verify", (stub) => stub.resolves(userData))
      .stub(auth, "refreshAccessToken", (stub) =>
        stub.resolves({
          ...mockAuthenticatedSession,
          accessToken: "new-access-token",
        }),
      )
      .stdout()
      .command(["whoami"])
      .it(
        "calls the refreshAccessTokenForSession and sets the user session",
        (ctx) => {
          sinon.assert.calledWith(UserConfigStore.prototype.set as any, {
            userSession: {
              ...mockAuthenticatedSession,
              accessToken: "new-access-token",
            },
          });

          sinon.assert.calledWith(auth.refreshAccessToken as any, {
            authUrl: DEFAULT_AUTH_URL,
            clientId: mockAuthenticatedSession.clientId,
            refreshToken: mockAuthenticatedSession.refreshToken,
          });

          expect(ctx.stdout).to.contain("Account name: Collab.io");
          expect(ctx.stdout).to.contain("User ID: 123");
        },
      );

    test
      .stub(UserConfigStore.prototype, "get", (stub) =>
        stub.returns({ userSession: mockAuthenticatedSession }),
      )
      .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
      .stub(Auth.prototype, "verify", (stub) => stub.resolves(userData))
      .stub(auth, "refreshAccessToken", (stub) =>
        stub.rejects(new Error("Failed to refresh access token")),
      )
      .stdout()
      .command(["whoami"])
      .it(
        "when the refreshAccessToken fails, it clears the user session",
        () => {
          sinon.assert.calledWith(UserConfigStore.prototype.set as any, {
            userSession: undefined,
          });

          sinon.assert.calledWith(auth.refreshAccessToken as any, {
            authUrl: DEFAULT_AUTH_URL,
            clientId: mockAuthenticatedSession.clientId,
            refreshToken: mockAuthenticatedSession.refreshToken,
          });
        },
      );
  });

  describe("given no service token flag", () => {
    test.command(["whoami"]).exit(2).it("exits with status 2");
  });
});
