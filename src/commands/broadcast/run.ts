import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import * as CustomFlags from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { indentString } from "@/lib/helpers/string";

export default class BroadcastRun extends BaseCommand<typeof BroadcastRun> {
  static summary =
    "Test run a broadcast for one recipient without publishing it.";

  static description = `
Runs the current version of a broadcast for a single recipient. This does not
publish the broadcast or message its target audience. Use --sandbox-mode to
generate messages without sending them to downstream providers.
`.trim();

  static flags = {
    environment: CustomFlags.environment,
    branch: CustomFlags.branch,
    recipient: Flags.string({
      required: true,
      summary: "The user id to run this broadcast for.",
    }),
    tenant: Flags.string({
      summary: "A tenant id for the broadcast run.",
    }),
    "sandbox-mode": Flags.boolean({
      summary:
        "When enabled, channels generate messages but don't send them to the downstream provider.",
    }),
    "skip-delay": Flags.boolean({
      summary: "When enabled, delay steps in this broadcast will be skipped.",
    }),
  };

  static args = {
    broadcastKey: Args.string({
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    const resp = await withSpinner<ApiV1.RunBroadcastResp>(
      () => this.apiV1.runBroadcast(this.props),
      { action: "‣ Running" },
    );

    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ran \`${args.broadcastKey}\` broadcast in ${scope}`,
    );
    this.log(
      indentString(`Broadcast run id: ${resp.data.broadcast_run_id}`, 4),
    );
  }
}
