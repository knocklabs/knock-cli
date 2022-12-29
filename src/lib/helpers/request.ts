import { CliUx } from "@oclif/core";
import { AxiosResponse } from "axios";

class APIError extends Error {}

const isSuccessResp = (resp: AxiosResponse) =>
  resp.status >= 200 && resp.status < 300;

/*
 * Helper function that wraps the underlying request function and handles
 * certain boilerplate operations around a req/resp cycle:
 *
 * 1) Starting a spinner before the request, and stopping it after the response
 * 2) Turning an error response into an APIError
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

  CliUx.ux.action.start(action);
  const resp = await requestFn();

  // Error out before the action stop so the spinner can update accordingly.
  if (ensureSuccess && !isSuccessResp(resp)) {
    const { message, code } = resp.data;
    CliUx.ux.error(new APIError(message), { code });
  }

  CliUx.ux.action.stop();
  return resp;
};
