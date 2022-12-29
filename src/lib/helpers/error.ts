import { CliUx } from "@oclif/core";
import { AxiosResponse } from "axios";

const isSuccessResp = (resp: AxiosResponse) =>
  resp.status >= 200 && resp.status < 300

export const isErrorResp = (resp: AxiosResponse) =>
  !isSuccessResp(resp)

export const logErrorResp = (resp: AxiosResponse) => {
  if (!isErrorResp(resp)) return;

  return CliUx.ux.log("\nError:\n  " + resp.data.message);
}
