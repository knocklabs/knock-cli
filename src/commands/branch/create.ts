import type { Branch } from "@knocklabs/mgmt/resources/branches";

import BaseCommand from "@/lib/base-command";
import { CustomArgs } from "@/lib/helpers/arg";
import { KnockEnv } from "@/lib/helpers/const";
import { withSpinnerV2 } from "@/lib/helpers/request";

export default class BranchCreate extends BaseCommand<typeof BranchCreate> {
  static summary = "Creates a new branch off of the development environment.";

  static enableJsonFlag = true;

  static args = {
    slug: CustomArgs.slug({
      required: true,
      description: "The slug for the new branch",
    }),
  };

  async run(): Promise<Branch | void> {
    const { args, flags } = this.props;

    const resp = await this.request(args.slug);

    if (flags.json) return resp;

    this.render(resp);
  }

  async request(slug: string): Promise<Branch> {
    return withSpinnerV2(() =>
      this.apiV1.mgmtClient.branches.create(slug, {
        environment: KnockEnv.Development,
      }),
    );
  }

  async render(data: Branch): Promise<void> {
    this.log(`‣ Successfully created branch \`${data.slug}\``);
    this.log(`  Created at: ${data.created_at}`);
  }
}
