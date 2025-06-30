import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { booleanStr } from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

export default class GuideActivate extends BaseCommand<typeof GuideActivate> {
  static summary = "Activate or deactivate a guide in a given environment.";

  static description = `
This enables or disables a guide in a given environment without
needing to go through environment promotion.

You can activate or deactivate a guide immediately or schedule it to be activated 
or deactivated at a later time using the --from and --until flags.
`.trim();

  static flags = {
    // Do not default to any env for this command, since this action runs
    // directly in each environment outside the commit and promote flow.
    environment: Flags.string({
      required: true,
      summary: "The environment to use.",
    }),
    status: booleanStr({
      summary:
        "The guide active status to set. Cannot be used with --from/--until.",
      exclusive: ["from", "until"],
    }),
    from: Flags.string({
      summary:
        "Activate the guide from this ISO8601 UTC datetime (e.g., '2024-01-15T10:30:00Z').",
      exclusive: ["status"],
    }),
    until: Flags.string({
      summary:
        "Deactivate the guide at this ISO8601 UTC datetime (e.g., '2024-01-15T18:30:00Z').",
      exclusive: ["status"],
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  static args = {
    guideKey: Args.string({
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    // Validate that either status OR from/until is provided
    const hasStatus = flags.status !== undefined;
    const hasFrom = Boolean(flags.from);
    const hasUntil = Boolean(flags.until);

    if (!hasStatus && !hasFrom && !hasUntil) {
      this.error("Either --status or --from/--until must be provided");
    }

    let action: string;
    if (hasStatus) {
      action = flags.status ? "Activate" : "Deactivate";
    } else if (hasFrom && hasUntil) {
      action = `Schedule activation from ${flags.from} until ${flags.until}`;
    } else if (hasFrom) {
      action = `Activate from ${flags.from}`;
    } else {
      action = `Deactivate at ${flags.until}`;
    }

    // 1. Confirm before activating or deactivating the guide, unless forced.
    const prompt = `${action} \`${args.guideKey}\` guide in \`${flags.environment}\` environment?`;
    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    // 2. Proceed to make a request to set the guide status.
    let actioning: string;
    if (hasStatus) {
      actioning = flags.status ? "Activating" : "Deactivating";
    } else {
      actioning = "Scheduling activation";
    }

    await withSpinner<ApiV1.ActivateGuideResp>(
      () => {
        return this.apiV1.activateGuide(this.props);
      },
      { action: `‣ ${actioning}` },
    );

    let actioned: string;
    if (hasStatus) {
      actioned = flags.status ? "activated" : "deactivated";
    } else {
      actioned = "scheduled";
    }

    this.log(
      `‣ Successfully ${actioned} \`${args.guideKey}\` guide in \`${flags.environment}\` environment`,
    );
  }
}
