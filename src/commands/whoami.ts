import { AuthVerifyResponse } from "@knocklabs/mgmt/resources/auth";

import BaseCommand from "@/lib/base-command";
import { withSpinnerV2 } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";

// user_name / user_email are returned by the API for OAuth contexts; the
// published @knocklabs/mgmt types may lag behind until the next SDK release.
type WhoamiResponse = AuthVerifyResponse & {
  user_name?: string | null;
  user_email?: string | null;
};

export default class Whoami extends BaseCommand<typeof Whoami> {
  static summary =
    "Verify authentication and show the current account and user.";

  static enableJsonFlag = true;

  public async run(): Promise<WhoamiResponse | void> {
    const resp = await withSpinnerV2<WhoamiResponse>(() =>
      this.apiV1.mgmtClient.auth.verify(),
    );

    const { flags } = this.props;
    if (flags.json) return resp;

    this.log(`‣ Successfully authenticated:`);

    const info = resp.service_token_name
      ? [
          `Account name: ${resp.account_name}`,
          `Service token name: ${resp.service_token_name}`,
        ]
      : [
          `Account name: ${resp.account_name}`,
          `User ID: ${resp.user_id}`,
          ...(resp.user_name ? [`User name: ${resp.user_name}`] : []),
          ...(resp.user_email ? [`User email: ${resp.user_email}`] : []),
        ];

    this.log(indentString(info.join("\n"), 4));
  }
}
