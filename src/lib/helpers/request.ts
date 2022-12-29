import { CliUx } from "@oclif/core";
import { AxiosResponse } from "axios";

const isSuccessResp = (resp: AxiosResponse) =>
  resp.status >= 200 && resp.status < 300;

class APIError extends Error {}

/*
 * Helper function that wraps the underlying request function and handles:
 *  1) Starting a spinner before the request, and stopping it after the response
 *  2) Printing an APIError if an error response was received
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

  if (ensureSuccess && !isSuccessResp(resp)) {
    const { message, code } = resp.data;
    CliUx.ux.error(new APIError(message), { code });
  }

  CliUx.ux.action.stop();
  return resp;
};
