import { Args } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { withSpinnerV2 } from "@/lib/helpers/request";

export default class BranchCreate extends BaseCommand<typeof BranchCreate> {
  // Hide until branches are released in GA
  static hidden = true;

  static summary = "Creates a new branch off of the development environment.";

  static enableJsonFlag = true;

  static args = {
    slug: Args.string({
      required: true,
      description: "The slug for the new branch",
    }),
  };

  async run(): Promise<ApiV1.BranchData | void> {
    const { args, flags } = this.props;

    const resp = await this.request(args.slug);

    if (flags.json) return resp;

    this.render(resp);
  }

  async request(slug: string): Promise<ApiV1.BranchData> {
    return withSpinnerV2<ApiV1.BranchData>(() =>
      this.apiV1.knockMgmt.post(`/v1/branches/${slug}`),
    );
  }

  async render(data: ApiV1.BranchData): Promise<void> {
    this.log(`‣ Successfully created branch \`${data.slug}\``);
    this.log(`  Created at: ${data.created_at}`);
  }
}
