import ApiV1 from "@/lib/api-v1";
import { isSuccessResp } from "@/lib/helpers/request";

export type FeatureName = "translations_allowed";

export interface FeatureCheckOptions {
  /**
   * Custom error message to show when the feature is not available.
   * If not provided, a default message will be used.
   */
  errorMessage?: string;
}

/**
 * Check if a specific feature is enabled for the current account.
 *
 * @param apiV1 - The API v1 client instance
 * @param featureName - The name of the feature to check
 * @param options - Additional options for the feature check
 * @returns Promise that resolves to an object with enabled status and optional message
 */
export async function checkAccountFeature(
  apiV1: ApiV1,
  featureName: FeatureName,
  options: FeatureCheckOptions = {},
): Promise<{ enabled: boolean; message?: string }> {
  try {
    const whoamiResp = await apiV1.whoami();

    if (!isSuccessResp(whoamiResp)) {
      return {
        enabled: false,
        message: `Unable to retrieve account information: ${whoamiResp.status} ${whoamiResp.statusText}`,
      };
    }

    const accountFeatures = whoamiResp.data.account_features;
    const isFeatureEnabled = accountFeatures?.[featureName] === true;

    if (!isFeatureEnabled) {
      const defaultMessage = `The ${featureName} feature is not enabled for your account. Please contact support to enable this feature.`;
      return {
        enabled: false,
        message: options.errorMessage || defaultMessage,
      };
    }

    return { enabled: true };
  } catch (error) {
    return {
      enabled: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while checking translations feature",
    };
  }
}

/**
 * Check if the translations feature is enabled for the current account.
 * This is a convenience function that wraps checkAccountFeature for the translations feature.
 *
 * @param apiV1 - The API v1 client instance
 * @param options - Additional options for the feature check
 * @returns Promise that resolves to an object with enabled status and optional message
 * @throws Error if translations are not enabled for the account
 */
export async function checkTranslationsFeature(
  apiV1: ApiV1,
  options: FeatureCheckOptions = {},
): Promise<{ enabled: boolean; message?: string }> {
  return checkAccountFeature(apiV1, "translations_allowed", {
    errorMessage:
      options.errorMessage ||
      "Translations are not enabled for your account. Please contact support to enable the translations feature.",
    ...options,
  });
}
