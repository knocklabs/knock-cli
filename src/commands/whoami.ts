import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { withSpinner } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";

export default class Whoami extends BaseCommand {
  static summary = "Verify the provided service token.";

  static enableJsonFlag = true;

  public async run(): Promise<ApiV1.WhoamiResp | void> {
    const resp = await withSpinner<ApiV1.WhoamiResp>(() => this.apiV1.whoami());

    const { flags } = this.props;
    if (flags.json) return resp.data;

    this.log(`‣ Successfully verified the provided service token:`);

    const info = [
      `Account name: ${resp.data.account_name}`,
      `Service token name: ${resp.data.service_token_name}`,
    ];
    this.log(indentString(info.join("\n"), 4));
  }
}
