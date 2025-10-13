import KnockMgmt, { type APIPromise } from "@knocklabs/mgmt";
import { ux } from "@oclif/core";
import { AxiosResponse } from "axios";

import { ApiError, formatErrors, InputError, JsonDataError } from "./error";
import { spinner } from "./ux";

export const isSuccessResp = (resp: AxiosResponse): boolean =>
  resp.status >= 200 && resp.status < 300;

/*
 * Returns a formatted error message from an error response based on status code.
 */
export const formatErrorRespMessage = ({
  status,
  data,
}: AxiosResponse): string => {
  if (status === 500) {
    return "An internal server error occurred";
  }

  const { message, errors = [] } = data;

  if (status >= 400) {
    const errs = errors.map(
      (e: InputError) => new JsonDataError(e.message, e.field),
    );
    return errs.length === 0
      ? message
      : message + "\n\n" + formatErrors(errs, { indentBy: 2 });
  }

  return message;
};

export const formatMgmtError = (
  apiError: InstanceType<
    typeof KnockMgmt.APIError<
      number,
      Headers,
      { message?: string; errors?: InputError[] }
    >
  >,
): string => {
  if (apiError.status === 500) {
    return "An internal server error occurred";
  }

  // Prefer the error message from the error object over
  // the error message formatted by the Stainless SDK
  const description = `${apiError.error.message ?? apiError.message} (status: ${
    apiError.status
  })`;

  const inputErrors = apiError.error.errors ?? [];

  if (Array.isArray(inputErrors) && inputErrors.length > 0) {
    const errs = inputErrors.map(
      (e: InputError) => new JsonDataError(e.message, e.field),
    );
    return errs.length === 0
      ? description
      : description + "\n\n" + formatErrors(errs, { indentBy: 2 });
  }

  return description;
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
};

export const withSpinner = async <T>(
  requestFn: () => Promise<AxiosResponse>,
  opts: WithSpinnerOpts = {},
): Promise<AxiosResponse<T>> => {
  const { action = "‣ Loading" } = opts;

  // Suppress printing the spinner in tests, oclif doesn't for some reasons.
  spinner.start(action);
  const resp = await requestFn();

  // Error out before the action stop so the spinner can update accordingly.
  if (!isSuccessResp(resp)) {
    const message = formatErrorRespMessage(resp);
    ux.error(new ApiError(message));
  }

  spinner.stop();
  return resp;
};

// For use with the KnockMgmt client
export const withSpinnerV2 = async <T>(
  requestFn: () => APIPromise<T>,
  opts: WithSpinnerOpts = {},
): Promise<T> => {
  const { action = "‣ Loading" } = opts;

  // Suppress printing the spinner in tests, oclif doesn't for some reasons.
  spinner.start(action);

  try {
    const resp = await requestFn();
    spinner.stop();
    return resp;
  } catch (error) {
    if (error instanceof KnockMgmt.APIError) {
      const message = formatMgmtError(error);
      return ux.error(new ApiError(message, error.status, error.error.code));
    }

    throw error;
  }
};
