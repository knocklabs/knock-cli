import { Args, Flags } from "@oclif/core";
import open from "open";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";

export default class GoalOpen extends BaseCommand<typeof GoalOpen> {
  static summary = "Open a goal in the Knock dashboard.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
  };

  static args = {
    goalKey: Args.string({
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { goalKey } = this.props.args;
    const { environment } = this.props.flags;

    const whoamiResp = await this.apiV1.whoami();
    const { account_slug } = whoamiResp.data;

    const url = `${this.sessionContext.dashboardOrigin}/${account_slug}/${environment}/goals/${goalKey}`;

    const scope = formatCommandScope(this.props.flags);
    this.log(`‣ Opening goal \`${goalKey}\` in ${scope}`);

    await open(url);
  }
}
