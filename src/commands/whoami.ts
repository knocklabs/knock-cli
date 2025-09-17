import { AuthVerifyResponse } from "@knocklabs/mgmt/resources/auth";

import BaseCommand from "@/lib/base-command";
import { withSpinnerV2 } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";

export default class Whoami extends BaseCommand<typeof Whoami> {
  static summary = "Verify the provided service token.";

  static enableJsonFlag = true;

  public async run(): Promise<AuthVerifyResponse | void> {
    const resp = await withSpinnerV2<AuthVerifyResponse>(() =>
      this.apiV1.knockMgmt.auth.verify(),
    );

    const { flags } = this.props;
    if (flags.json) return resp;

    this.log(`‣ Successfully authenticated:`);

    const info = resp.service_token_name
      ? [
          `Account name: ${resp.account_name}`,
          `Service token name: ${resp.service_token_name}`,
        ]
      : [`Account name: ${resp.account_name}`, `User ID: ${resp.user_id}`];

    this.log(indentString(info.join("\n"), 4));
  }
}
