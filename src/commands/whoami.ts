import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { withSpinner } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";

export default class Whoami extends BaseCommand {
  static enableJsonFlag = true;

  public async run(): Promise<void> {
    const resp = await withSpinner<ApiV1.WhoamiResp>(() => this.apiV1.whoami());

    this.log(`‣ Successfully verified the provided service token:`);

    const info = [
      `Account name: ${resp.data.account_name}`,
      `Service token name: ${resp.data.service_token_name}`,
    ];
    this.log(indentString(info.join("\n"), 4));
  }
}
