import { AxiosResponse } from "axios";

import { formatErrorRespMessage } from "./request";

// What to do next, for the errors the API's own message doesn't cover.
const NEXT_STEPS: Record<string, string> = {
  headless_account_required:
    "Use the service token from `knock signup`, by passing --service-token or setting KNOCK_SERVICE_TOKEN.",
  headless_account_expired: "Run `knock signup` to create a new account.",
};

/*
 * Returns the message for a headless account error response, with what to do
 * next. The API sends a Retry-After header with its 429s and 503s.
 */
export const formatHeadlessAccountError = (resp: AxiosResponse): string => {
  const retryAfter = resp.headers?.["retry-after"];

  return [
    formatErrorRespMessage(resp),
    retryAfter &&
      `Try again in ${retryAfter} ${
        retryAfter === "1" ? "second" : "seconds"
      }.`,
    NEXT_STEPS[resp.data?.code],
  ]
    .filter(Boolean)
    .join(" ");
};

// Wrapped in an object so tests can skip the wait.
export const timer = {
  async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  },
};
