export const DEFAULT_DASHBOARD_URL = "https://dashboard.knock.app";
export const DEFAULT_AUTH_URL = "https://signin.knock.app";
export const DEFAULT_API_URL = "https://control.knock.app";

export const authSuccessUrl = (dashboardUrl: string): string =>
  `${dashboardUrl}/auth/oauth/cli`;

export const authErrorUrl = (dashboardUrl: string, error: string): string =>
  `${dashboardUrl}/auth/oauth/cli?error=${error}`;

export const viewWorkflowUrl = (
  dashboardUrl: string,
  accountSlug: string,
  envOrBranchSlug: string,
  workflowKey: string,
): string =>
  `${dashboardUrl}/${accountSlug}/${envOrBranchSlug.toLowerCase()}/workflows/${workflowKey}`;

export const viewGuideUrl = (
  dashboardUrl: string,
  accountSlug: string,
  envOrBranchSlug: string,
  guideKey: string,
): string =>
  `${dashboardUrl}/${accountSlug}/${envOrBranchSlug.toLowerCase()}/guides/${guideKey}`;

export const viewLayoutUrl = (
  dashboardUrl: string,
  accountSlug: string,
  envOrBranchSlug: string,
  layoutKey: string,
): string =>
  `${dashboardUrl}/${accountSlug}/${envOrBranchSlug.toLowerCase()}/layouts/${layoutKey}`;

export const viewMessageTypeUrl = (
  dashboardUrl: string,
  accountSlug: string,
  envOrBranchSlug: string,
  messageTypeKey: string,
): string =>
  `${dashboardUrl}/${accountSlug}/${envOrBranchSlug.toLowerCase()}/message-types/${messageTypeKey}`;

export const viewPartialUrl = (
  dashboardUrl: string,
  accountSlug: string,
  envOrBranchSlug: string,
  partialKey: string,
): string =>
  `${dashboardUrl}/${accountSlug}/${envOrBranchSlug.toLowerCase()}/partials/${partialKey}`;
