import crypto from "node:crypto";
import http from "node:http";

import { authErrorUrl, authSuccessUrl } from "./urls";
import { browser } from "./helpers";

const DEFAULT_TIMEOUT = 5000;

export type AuthenticatedSession = {
  accessToken: string;
  clientId: string;
  expiresAt: Date;
  refreshToken: string;
  idToken: string;
};

type ExchangeCodeForTokenParams = {
  tokenEndpoint: string;
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
};

type RefreshAccessTokenParams = {
  authUrl: string;
  clientId: string;
  refreshToken: string;
};

function createChallenge() {
  // PKCE code verifier and challenge
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const state = crypto.randomUUID();

  return { codeVerifier, codeChallenge, state };
}

export async function getOAuthServerUrls(apiUrl: string) {
  const { protocol, host } = new URL(apiUrl);
  const wellKnownUrl = `${protocol}//${host}/.well-known/oauth-authorization-server`;

  const response = await fetch(wellKnownUrl, {
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });

  if (response.ok) {
    const data = (await response.json()) as {
      authorization_endpoint: string;
      token_endpoint: string;
      registration_endpoint: string;
      issuer: string;
    };

    return {
      registrationEndpoint: data.registration_endpoint,
      authorizationEndpoint: data.authorization_endpoint,
      tokenEndpoint: data.token_endpoint,
      issuer: data.issuer,
    };
  }

  throw new Error("Failed to fetch OAuth server metadata");
}

export async function registerClient(
  registrationEndpoint: string,
  redirectUri: string,
) {
  const registrationResponse = await fetch(registrationEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_name: "Knock CLI",
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
      redirect_uris: [redirectUri],
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });

  if (!registrationResponse.ok) {
    console.log(await registrationResponse.json());
    throw new Error(`Could not register client with OAuth server`);
  }

  const registrationData: { client_id: string } =
    await registrationResponse.json();

  return registrationData.client_id;
}

async function parseTokenResponse(response: Response) {
  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function exchangeCodeForToken(params: ExchangeCodeForTokenParams) {
  const response = await fetch(params.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: params.clientId,
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    let errorDescription: string | undefined;

    try {
      const errorResponse = await response.json();
      errorDescription = errorResponse.error_description || errorResponse.error;
    } catch {
      // ignore
    }

    return { error: errorDescription ?? "unknown error" };
  }

  return {
    ...(await parseTokenResponse(response)),
    clientId: params.clientId,
  };
}

export async function refreshAccessToken(
  params: RefreshAccessTokenParams,
): Promise<AuthenticatedSession> {
  const { tokenEndpoint } = await getOAuthServerUrls(params.authUrl);

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: params.clientId,
      refresh_token: params.refreshToken,
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  return {
    ...(await parseTokenResponse(response)),
    clientId: params.clientId,
  };
}

export async function waitForAccessToken(
  dashboardUrl: string,
  authUrl: string,
): Promise<AuthenticatedSession> {
  const { authorizationEndpoint, tokenEndpoint, registrationEndpoint } =
    await getOAuthServerUrls(authUrl);

  let resolve: (args: AuthenticatedSession) => void;
  let reject: (arg0: Error) => void;

  const promise = new Promise<AuthenticatedSession>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const { codeVerifier, codeChallenge, state } = createChallenge();

  const timeout = setTimeout(() => {
    cleanupAndReject(
      `authentication timed out after ${DEFAULT_TIMEOUT / 1000} seconds`,
    );
  }, 60_000);

  function cleanupAndReject(message: string) {
    cleanup();
    reject(new Error(`Could not authenticate: ${message}`));
  }

  function cleanup() {
    clearTimeout(timeout);
    server.close();
    server.closeAllConnections();
  }

  const server = http.createServer();

  server.listen();

  const address = server.address();
  if (address === null || typeof address !== "object") {
    throw new Error("Could not start server");
  }

  const callbackPath = "/oauth_callback";
  const redirectUri = `http://localhost:${address.port}${callbackPath}`;

  const clientId = await registerClient(registrationEndpoint, redirectUri);

  const params = {
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    scope: "openid email offline_access",
  };

  const browserUrl = `${authorizationEndpoint}?${new URLSearchParams(
    params,
  ).toString()}`;

  server.on("request", async (req, res) => {
    if (!clientId || !redirectUri) {
      res.writeHead(500).end("Something went wrong");

      cleanupAndReject("something went wrong");
      return;
    }

    const url = new URL(req.url ?? "/", "http://127.0.0.1");

    if (url.pathname !== callbackPath) {
      res.writeHead(404).end("Invalid path");

      cleanupAndReject("invalid path");
      return;
    }

    const error = url.searchParams.get("error");
    if (error) {
      res.writeHead(400).end("Could not authenticate");

      const errorDescription = url.searchParams.get("error_description");
      cleanupAndReject(`${errorDescription || error} `);
      return;
    }

    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(400).end("Could not authenticate");

      cleanupAndReject("no code provided");
      return;
    }

    const response = await exchangeCodeForToken({
      tokenEndpoint,
      clientId,
      code,
      codeVerifier,
      redirectUri,
    });

    if ("error" in response) {
      res
        .writeHead(302, {
          location: authErrorUrl(
            dashboardUrl,
            "Could not authenticate: unable to fetch access token",
          ),
        })
        .end("Could not authenticate");

      cleanupAndReject(JSON.stringify(response.error));
      return;
    }

    res
      .writeHead(302, { location: authSuccessUrl(dashboardUrl) })
      .end("Authentication successful");

    cleanup();
    resolve({ ...response, clientId });
  });

  console.log(`Opened web browser to facilitate auth: ${browserUrl}`);

  browser.openUrl(browserUrl);

  return promise;
}

export default { waitForAccessToken };
