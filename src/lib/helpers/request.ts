import { CliUx } from "@oclif/core";
import { AxiosResponse } from "axios";

import { isTestEnv } from "./env";
import { ApiError, formatErrors, InputError, JsonError } from "./error";

const isSuccessResp = (resp: AxiosResponse) =>
  resp.status >= 200 && resp.status < 300;

/*
 * Returns a formatted error message from an error response based on status code.
 */
const formatErrorRespMessage = (resp: AxiosResponse): string => {
  const { message, errors = [] } = resp.data;

  switch (resp.status) {
    case 422: {
      const errs = errors.map(
        (e: InputError) => new JsonError(e.message, e.field),
      );
      return errs.length === 0
        ? message
        : message + "\n\n" + formatErrors(errs);
    }

    case 500: {
      return "An internal server error occurred";
    }

    default: {
      return message;
    }
  }
};

/*
 * Helper function that wraps the underlying request function and handles
 * certain boilerplate operations around a req/resp cycle:
 *
 * 1) Starting a spinner before the request, and stopping it after the response
 * 2) Turning an error response into an ApiError
 */
type WithSpinnerOpts = {
  action?: string;
  ensureSuccess?: boolean;
};

export const withSpinner = async <T>(
  requestFn: () => Promise<AxiosResponse>,
  opts: WithSpinnerOpts = {},
): Promise<AxiosResponse<T>> => {
  const { action = "‣ Loading", ensureSuccess = true } = opts;

  // Suppress printing the spinner in tests, oclif doesn't for some reasons.
  if (!isTestEnv) CliUx.ux.action.start(action);
  const resp = await requestFn();

  // Error out before the action stop so the spinner can update accordingly.
  if (ensureSuccess && !isSuccessResp(resp)) {
    const message = formatErrorRespMessage(resp);
    CliUx.ux.error(new ApiError(message));
  }

  CliUx.ux.action.stop();
  return resp;
};
