import { ux } from "@oclif/core";

import {
  GetHeadlessAccountStatusResp,
  HeadlessAccountStatus,
} from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import { formatHeadlessAccountError } from "@/lib/helpers/headless-account";
import { isSuccessResp } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";
import { spinner } from "@/lib/helpers/ux";

const NEXT_STEPS: Record<HeadlessAccountStatus, string> = {
  provisioning: "The account is still being set up. Check again in 5 seconds.",
  unclaimed:
    "The account is ready. To hand it to a person, run `knock headless claim --email <email>`.",
  claimed: "A person claimed the account. Your service token keeps working.",
  expired:
    "The account has expired. Run `knock signup --headless` to create a new one.",
};

export default class HeadlessStatus extends BaseCommand<typeof HeadlessStatus> {
  static summary = "Show the status of a headless account.";

  static description =
    "Shows whether the account is still being set up (provisioning), ready to " +
    "be claimed (unclaimed), claimed by a person (claimed), or past its claim " +
    "window (expired). Accepts one request per second.";

  static enableJsonFlag = true;

  public async run(): Promise<GetHeadlessAccountStatusResp | void> {
    const { flags } = this.props;

    spinner.start("‣ Loading");

    const resp = await this.apiV1.getHeadlessAccountStatus();

    if (!isSuccessResp(resp)) {
      ux.error(new ApiError(formatHeadlessAccountError(resp)));
    }

    spinner.stop();

    if (flags.json) return resp.data;

    this.render(resp.data);
  }

  private render({ status, expires_at }: GetHeadlessAccountStatusResp): void {
    const info = [
      `Status: ${status}`,
      ...(expires_at ? [`Expires at: ${expires_at}`] : []),
    ];

    this.log("‣ Headless account:");
    this.log(indentString(info.join("\n"), 4));
    this.log("");
    this.log(`‣ ${NEXT_STEPS[status]}`);
  }
}
