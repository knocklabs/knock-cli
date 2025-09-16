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
    if (flags.json) return resp.data;

    this.log(`‣ Successfully authenticated:`);

    let info: string[] = [];

    info = resp.data.service_token_name
      ? [
          `Account name: ${resp.data.account_name}`,
          `Service token name: ${resp.data.service_token_name}`,
        ]
      : [
          `Account name: ${resp.data.account_name}`,
          `User ID: ${resp.data.user_id}`,
        ];

    this.log(indentString(info.join("\n"), 4));
  }
}
