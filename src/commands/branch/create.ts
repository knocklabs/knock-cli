import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { CustomArgs } from "@/lib/helpers/arg";
import { withSpinnerV2 } from "@/lib/helpers/request";
import { promptForBranchSlug } from "@/lib/helpers/ux";

export default class BranchCreate extends BaseCommand<typeof BranchCreate> {
  static summary = "Creates a new branch off of the development environment.";

  static enableJsonFlag = true;

  static args = {
    slug: CustomArgs.slug({
      required: false,
      description: "The slug for the new branch",
    }),
  };

  async run(): Promise<ApiV1.BranchData | void> {
    const { args, flags } = this.props;

    // If slug is provided, use it directly
    let slug = args.slug;

    // Otherwise, prompt for it with Git branch as default
    if (!slug) {
      slug = await promptForBranchSlug();
    }

    if (!slug) {
      return this.error("Invalid slug provided");
    }

    const resp = await this.request(slug);

    if (flags.json) return resp;

    this.render(resp);
  }

  async request(slug: string): Promise<ApiV1.BranchData> {
    return withSpinnerV2<ApiV1.BranchData>(() =>
      this.apiV1.mgmtClient.post(`/v1/branches/${slug}`),
    );
  }

  async render(data: ApiV1.BranchData): Promise<void> {
    this.log(`‣ Successfully created branch \`${data.slug}\``);
    this.log(`  Created at: ${data.created_at}`);
  }
}
