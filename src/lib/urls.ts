export const DEFAULT_DASHBOARD_URL = "https://dashboard.knock.app";
export const DEFAULT_AUTH_URL = "https://signin.knock.app";
export const DEFAULT_API_URL = "https://control.knock.app";

export const authSuccessUrl = (dashboardUrl: string) =>
  `${dashboardUrl}/auth/oauth/cli`;

export const authErrorUrl = (dashboardUrl: string, error: string) =>
  `${dashboardUrl}/auth/oauth/cli?error=${error}`;
