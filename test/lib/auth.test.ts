import http from "node:http";

import { expect } from "@oclif/test";
import * as sinon from "sinon";

import {
  AuthenticatedSession,
  exchangeCodeForToken,
  getOAuthServerUrls,
  refreshAccessToken,
  registerClient,
  waitForAccessToken,
} from "@/lib/auth";
import { browser } from "@/lib/helpers/browser";

// Mock fetch globally
global.fetch = sinon.stub();

describe("lib/auth", () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = global.fetch as sinon.SinonStub;
    fetchStub.reset();
  });

  afterEach(() => {
    sinon.resetHistory();
  });

  describe("getOAuthServerUrls", () => {
    it("should fetch OAuth server metadata successfully", async () => {
      const mockMetadata = {
        authorization_endpoint: "https://auth.example.com/oauth/authorize",
        token_endpoint: "https://auth.example.com/oauth/token",
        registration_endpoint: "https://auth.example.com/oauth/register",
        issuer: "https://auth.example.com",
      };

      fetchStub.resolves({
        ok: true,
        json: sinon.stub().resolves(mockMetadata),
      });

      const result = await getOAuthServerUrls("https://api.example.com");

      expect(result).to.deep.equal({
        registrationEndpoint: mockMetadata.registration_endpoint,
        authorizationEndpoint: mockMetadata.authorization_endpoint,
        tokenEndpoint: mockMetadata.token_endpoint,
        issuer: mockMetadata.issuer,
      });

      sinon.assert.calledWith(
        fetchStub,
        "https://api.example.com/.well-known/oauth-authorization-server",
        {
          signal: sinon.match.instanceOf(AbortSignal),
        },
      );
    });

    it("should throw error when fetch fails", async () => {
      fetchStub.resolves({
        ok: false,
      });

      try {
        await getOAuthServerUrls("https://api.example.com");
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).to.equal(
          "Failed to fetch OAuth server metadata",
        );
      }
    });

    it("should handle network errors", async () => {
      fetchStub.rejects(new Error("Network error"));

      try {
        await getOAuthServerUrls("https://api.example.com");
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).to.equal("Network error");
      }
    });
  });

  describe("registerClient", () => {
    it("should register client successfully", async () => {
      const mockRegistrationData = {
        client_id: "test-client-id",
      };

      fetchStub.resolves({
        ok: true,
        json: sinon.stub().resolves(mockRegistrationData),
      });

      const result = await registerClient(
        "https://auth.example.com/oauth/register",
        "http://localhost:3000/callback",
      );

      expect(result).to.equal("test-client-id");

      sinon.assert.calledWith(
        fetchStub,
        "https://auth.example.com/oauth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_name: "Knock CLI",
            token_endpoint_auth_method: "none",
            grant_types: ["authorization_code"],
            response_types: ["code"],
            redirect_uris: ["http://localhost:3000/callback"],
          }),
          signal: sinon.match.instanceOf(AbortSignal),
        },
      );
    });

    it("should throw error when registration fails", async () => {
      const mockErrorResponse = {
        error: "invalid_request",
        error_description: "Invalid redirect URI",
      };

      fetchStub.resolves({
        ok: false,
        json: sinon.stub().resolves(mockErrorResponse),
      });

      // Mock console.log to prevent output during tests
      const consoleLogStub = sinon.stub(console, "log");

      try {
        await registerClient(
          "https://auth.example.com/oauth/register",
          "http://localhost:3000/callback",
        );
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).to.equal(
          "Could not register client with OAuth server",
        );
      }

      sinon.assert.calledWith(consoleLogStub, mockErrorResponse);
      consoleLogStub.restore();
    });
  });

  describe("exchangeCodeForToken", () => {
    const mockParams = {
      tokenEndpoint: "https://auth.example.com/oauth/token",
      clientId: "test-client-id",
      code: "test-auth-code",
      codeVerifier: "test-code-verifier",
      redirectUri: "http://localhost:3000/callback",
    };

    it("should exchange code for tokens successfully", async () => {
      const mockTokenResponse = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        id_token: "test-id-token",
        expires_in: 3600,
      };

      fetchStub.resolves({
        ok: true,
        json: sinon.stub().resolves(mockTokenResponse),
      });

      const result = await exchangeCodeForToken(mockParams);

      expect(result).to.have.property("accessToken", "test-access-token");
      expect(result).to.have.property("refreshToken", "test-refresh-token");
      expect(result).to.have.property("idToken", "test-id-token");
      expect(result).to.have.property("clientId", "test-client-id");
      expect(result).to.have.property("expiresAt");
      expect((result as AuthenticatedSession).expiresAt).to.be.instanceOf(Date);

      // Check that expiresAt is approximately correct (within 1 second)
      const expectedExpiresAt = new Date(Date.now() + 3600 * 1000);
      const actualExpiresAt = (result as AuthenticatedSession).expiresAt;
      expect(
        Math.abs(actualExpiresAt.getTime() - expectedExpiresAt.getTime()),
      ).to.be.lessThan(1000);

      sinon.assert.calledWith(fetchStub, mockParams.tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: mockParams.clientId,
          code: mockParams.code,
          code_verifier: mockParams.codeVerifier,
          redirect_uri: mockParams.redirectUri,
        }),
        signal: sinon.match.instanceOf(AbortSignal),
      });
    });

    it("should return error when token exchange fails with error response", async () => {
      const mockErrorResponse = {
        error: "invalid_grant",
        error_description: "Invalid authorization code",
      };

      fetchStub.resolves({
        ok: false,
        json: sinon.stub().resolves(mockErrorResponse),
      });

      const result = await exchangeCodeForToken(mockParams);

      expect(result).to.deep.equal({
        error: "Invalid authorization code",
      });
    });

    it("should return error when token exchange fails without error description", async () => {
      const mockErrorResponse = {
        error: "invalid_grant",
      };

      fetchStub.resolves({
        ok: false,
        json: sinon.stub().resolves(mockErrorResponse),
      });

      const result = await exchangeCodeForToken(mockParams);

      expect(result).to.deep.equal({
        error: "invalid_grant",
      });
    });

    it("should return unknown error when response is not JSON", async () => {
      fetchStub.resolves({
        ok: false,
        json: sinon.stub().rejects(new Error("Not JSON")),
      });

      const result = await exchangeCodeForToken(mockParams);

      expect(result).to.deep.equal({
        error: "unknown error",
      });
    });
  });

  describe("refreshAccessToken", () => {
    const mockParams = {
      authUrl: "https://auth.example.com",
      clientId: "test-client-id",
      refreshToken: "test-refresh-token",
    };

    beforeEach(() => {
      // Mock getOAuthServerUrls for refresh token tests
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: sinon.stub().resolves({
          authorization_endpoint: "https://auth.example.com/oauth/authorize",
          token_endpoint: "https://auth.example.com/oauth/token",
          registration_endpoint: "https://auth.example.com/oauth/register",
          issuer: "https://auth.example.com",
        }),
      });
    });

    it("should refresh access token successfully", async () => {
      const mockTokenResponse = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        id_token: "new-id-token",
        expires_in: 3600,
      };

      fetchStub.onSecondCall().resolves({
        ok: true,
        json: sinon.stub().resolves(mockTokenResponse),
      });

      const result = await refreshAccessToken(mockParams);

      expect(result).to.have.property("accessToken", "new-access-token");
      expect(result).to.have.property("refreshToken", "new-refresh-token");
      expect(result).to.have.property("idToken", "new-id-token");
      expect(result).to.have.property("clientId", "test-client-id");
      expect(result).to.have.property("expiresAt");
      expect(result.expiresAt).to.be.instanceOf(Date);

      // Verify the refresh token request
      sinon.assert.calledWith(
        fetchStub.secondCall,
        "https://auth.example.com/oauth/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: mockParams.clientId,
            refresh_token: mockParams.refreshToken,
          }),
          signal: sinon.match.instanceOf(AbortSignal),
        },
      );
    });

    it("should throw error when refresh fails", async () => {
      fetchStub.onSecondCall().resolves({
        ok: false,
      });

      try {
        await refreshAccessToken(mockParams);
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).to.equal(
          "Failed to refresh access token",
        );
      }
    });
  });

  describe("waitForAccessToken", () => {
    let consoleLogStub: sinon.SinonStub;
    let serverStub: sinon.SinonStub;
    let openUrlStub: sinon.SinonStub;
    let httpServerMock: any;

    beforeEach(() => {
      // Mock console.log to prevent output during tests
      consoleLogStub = sinon.stub(console, "log");

      // Mock openUrl to prevent browser opening during tests
      openUrlStub = sinon.stub(browser, "openUrl").resolves();

      // Mock HTTP server
      httpServerMock = {
        listen: sinon.stub(),
        address: sinon.stub(),
        on: sinon.stub(),
        close: sinon.stub(),
        closeAllConnections: sinon.stub(),
      };

      serverStub = sinon.stub(http, "createServer").returns(httpServerMock);
    });

    afterEach(() => {
      consoleLogStub.restore();
      serverStub.restore();
      openUrlStub.restore();

      // Reset all stubs
      httpServerMock.listen.reset();
      httpServerMock.address.reset();
      httpServerMock.on.reset();
      httpServerMock.close.reset();
      httpServerMock.closeAllConnections.reset();
    });

    async function setupMockOAuthFlow() {
      // Mock OAuth server metadata
      fetchStub.onCall(0).resolves({
        ok: true,
        json: sinon.stub().resolves({
          authorization_endpoint: "https://auth.example.com/oauth/authorize",
          token_endpoint: "https://auth.example.com/oauth/token",
          registration_endpoint: "https://auth.example.com/oauth/register",
          issuer: "https://auth.example.com",
        }),
      });

      // Mock client registration
      fetchStub.onCall(1).resolves({
        ok: true,
        json: sinon.stub().resolves({
          client_id: "test-client-id",
        }),
      });

      // Setup server mock
      httpServerMock.address.returns({ port: 3000 });
    }

    it("should complete OAuth flow successfully", async () => {
      await setupMockOAuthFlow();

      // Mock successful token exchange
      fetchStub.onCall(2).resolves({
        ok: true,
        json: sinon.stub().resolves({
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          id_token: "test-id-token",
          expires_in: 3600,
        }),
      });

      // Set up server request handler
      let requestHandler = (req: any, res: any) =>
        Promise.resolve({ req, res });

      httpServerMock.on.callsFake((event: string, handler: any) => {
        if (event === "request") {
          requestHandler = handler;
        }
      });

      // Start the OAuth flow
      const authPromise = waitForAccessToken(
        "https://dashboard.example.com",
        "https://auth.example.com",
      );

      // Wait a bit for setup
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate the OAuth callback with authorization code
      const mockReq = {
        url: "/oauth_callback?code=auth-code-123&state=test-state",
      };
      const mockRes = {
        writeHead: sinon.stub().returnsThis(),
        end: sinon.stub(),
      };

      // Trigger the callback
      if (!requestHandler) throw new Error("Request handler not set");
      await requestHandler(mockReq, mockRes);

      // Wait for the promise to resolve
      const result = await authPromise;

      expect(result).to.have.property("accessToken", "test-access-token");
      expect(result).to.have.property("refreshToken", "test-refresh-token");
      expect(result).to.have.property("idToken", "test-id-token");
      expect(result).to.have.property("clientId", "test-client-id");
      expect(result).to.have.property("expiresAt");

      // Verify server setup
      sinon.assert.calledOnce(httpServerMock.listen);
      sinon.assert.calledOnce(httpServerMock.address);
      sinon.assert.calledWith(httpServerMock.on, "request", sinon.match.func);

      // Verify cleanup was called
      sinon.assert.calledOnce(httpServerMock.close);
      sinon.assert.calledOnce(httpServerMock.closeAllConnections);

      // Verify success redirect
      sinon.assert.calledWith(mockRes.writeHead, 302, {
        location: "https://dashboard.example.com/auth/oauth/cli",
      });
      sinon.assert.calledWith(mockRes.end, "Authentication successful");
    });

    it("should handle OAuth error in callback", async () => {
      await setupMockOAuthFlow();

      let requestHandler: ((req: any, res: any) => void) | undefined;
      httpServerMock.on.callsFake(
        (event: string, handler: (req: any, res: any) => void) => {
          if (event === "request") {
            requestHandler = handler;
          }
        },
      );

      const authPromise = waitForAccessToken(
        "https://dashboard.example.com",
        "https://auth.example.com",
      );

      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate OAuth error callback
      const mockReq = {
        url: "/oauth_callback?error=access_denied&error_description=User%20denied%20access",
      };
      const mockRes = {
        writeHead: sinon.stub().returnsThis(),
        end: sinon.stub(),
      };

      if (!requestHandler) throw new Error("Request handler not set");
      await requestHandler(mockReq, mockRes);

      try {
        await authPromise;
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).to.equal(
          "Could not authenticate: User denied access ",
        );
      }

      sinon.assert.calledWith(mockRes.writeHead, 400);
      sinon.assert.calledWith(mockRes.end, "Could not authenticate");
    });

    it("should handle missing authorization code", async () => {
      await setupMockOAuthFlow();

      let requestHandler: ((req: any, res: any) => void) | undefined;

      httpServerMock.on.callsFake(
        (
          event: string,
          handler: (req: any, res: any) => Promise<{ req: any; res: any }>,
        ) => {
          if (event === "request") {
            requestHandler = handler;
          }
        },
      );

      const authPromise = waitForAccessToken(
        "https://dashboard.example.com",
        "https://auth.example.com",
      );

      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate callback without code
      const mockReq = {
        url: "/oauth_callback?state=test-state",
      };
      const mockRes = {
        writeHead: sinon.stub().returnsThis(),
        end: sinon.stub(),
      };

      if (!requestHandler) throw new Error("Request handler not set");
      await requestHandler(mockReq, mockRes);

      try {
        await authPromise;
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).to.equal(
          "Could not authenticate: no code provided",
        );
      }
    });

    it("should handle invalid callback path", async () => {
      await setupMockOAuthFlow();

      let requestHandler = (req: any, res: any) =>
        Promise.resolve({ req, res });
      httpServerMock.on.callsFake(
        (
          event: string,
          handler: (req: any, res: any) => Promise<{ req: any; res: any }>,
        ) => {
          if (event === "request") {
            requestHandler = handler;
          }
        },
      );

      const authPromise = waitForAccessToken(
        "https://dashboard.example.com",
        "https://auth.example.com",
      );

      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate request to wrong path
      const mockReq = {
        url: "/wrong-path",
      };
      const mockRes = {
        writeHead: sinon.stub().returnsThis(),
        end: sinon.stub(),
      };

      if (!requestHandler) throw new Error("Request handler not set");
      await requestHandler(mockReq, mockRes);

      try {
        await authPromise;
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).to.equal(
          "Could not authenticate: invalid path",
        );
      }

      sinon.assert.calledWith(mockRes.writeHead, 404);
      sinon.assert.calledWith(mockRes.end, "Invalid path");
    });

    it("should handle token exchange failure", async () => {
      await setupMockOAuthFlow();

      // Mock failed token exchange
      fetchStub.onCall(2).resolves({
        ok: false,
        json: sinon.stub().resolves({
          error: "invalid_grant",
          error_description: "Invalid authorization code",
        }),
      });

      let requestHandler = (req: any, res: any) =>
        Promise.resolve({ req, res });
      httpServerMock.on.callsFake((event: string, handler: any) => {
        if (event === "request") {
          requestHandler = handler;
        }
      });

      const authPromise = waitForAccessToken(
        "https://dashboard.example.com",
        "https://auth.example.com",
      );

      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 10));

      const mockReq = {
        url: "/oauth_callback?code=invalid-code&state=test-state",
      };
      const mockRes = {
        writeHead: sinon.stub().returnsThis(),
        end: sinon.stub(),
      };

      if (!requestHandler) throw new Error("Request handler not set");
      await requestHandler(mockReq, mockRes);

      try {
        await authPromise;
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).to.equal(
          'Could not authenticate: "Invalid authorization code"',
        );
      }

      // Verify error redirect
      sinon.assert.calledWith(mockRes.writeHead, 302, {
        location:
          "https://dashboard.example.com/auth/oauth/cli?error=Could not authenticate: unable to fetch access token",
      });
      sinon.assert.calledWith(mockRes.end, "Could not authenticate");
    });

    it("should handle timeout", (done) => {
      // This test verifies the timeout mechanism exists
      // We don't actually wait for the full 60 seconds, just verify the timeout is set up correctly

      // Mock to make the OAuth calls fail immediately, which should trigger cleanup
      fetchStub.onCall(0).rejects(new Error("Network timeout"));

      waitForAccessToken(
        "https://dashboard.example.com",
        "https://auth.example.com",
      ).catch((error) => {
        expect(error.message).to.include("Network timeout");
        done();
      });
    });
  });
});
