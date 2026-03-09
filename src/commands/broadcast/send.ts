import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import * as CustomFlags from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class BroadcastSend extends BaseCommand<typeof BroadcastSend> {
  static summary = "Send or schedule a broadcast in a given environment.";

  static description = `
Sends a broadcast immediately or schedules it for a future time. Use the
--send-at flag to schedule the broadcast for a specific time.
`.trim();

  static flags = {
    environment: Flags.string({
      required: true,
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    "send-at": Flags.string({
      summary:
        "ISO 8601 datetime to schedule the broadcast. Omit to send immediately.",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  static args = {
    broadcastKey: Args.string({
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    const action = flags["send-at"] ? "Schedule" : "Send";
    const scope = formatCommandScope(flags);
    const prompt = `${action} \`${args.broadcastKey}\` broadcast in ${scope}?`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    const actioning = flags["send-at"] ? "Scheduling" : "Sending";
    await withSpinner<ApiV1.SendBroadcastResp>(
      () => this.apiV1.sendBroadcast(this.props),
      { action: `‣ ${actioning}` },
    );

    const actioned = flags["send-at"] ? "scheduled" : "sent";
    this.log(
      `‣ Successfully ${actioned} \`${args.broadcastKey}\` broadcast in ${scope}`,
    );
  }
}
