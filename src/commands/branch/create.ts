import type { Branch } from "@knocklabs/mgmt/resources/branches";
import { prompt } from "enquirer";

import BaseCommand from "@/lib/base-command";
import { CustomArgs } from "@/lib/helpers/arg";
import { KnockEnv } from "@/lib/helpers/const";
import { getCurrentGitBranch } from "@/lib/helpers/git";
import { withSpinnerV2 } from "@/lib/helpers/request";
import { slugify } from "@/lib/helpers/string";

export default class BranchCreate extends BaseCommand<typeof BranchCreate> {
  static summary = "Creates a new branch off of the development environment.";

  static enableJsonFlag = true;

  static args = {
    slug: CustomArgs.slug({
      required: false,
      description: "The slug for the new branch",
    }),
  };

  async run(): Promise<Branch | void> {
    const { args, flags } = this.props;

    // If slug is provided, use it directly
    let slug = args.slug;

    // Otherwise, prompt for it with Git branch as default
    if (!slug) {
      slug = await this.promptForBranchSlug();
    }

    if (!slug) {
      return this.error("Invalid slug provided");
    }

    const resp = await this.request(slug);

    if (flags.json) return resp;

    this.render(resp);
  }

  async promptForBranchSlug(): Promise<string | undefined> {
    const gitBranch = getCurrentGitBranch();
    const initial = gitBranch ? slugify(gitBranch) : undefined;

    try {
      const response = await prompt<{ slug: string }>({
        type: "input",
        name: "slug",
        message: "Branch slug",
        initial,
        validate: (value: string) => {
          const slugified = slugify(value);
          if (!slugified) {
            return "Invalid slug provided";
          }

          return true;
        },
      });

      return slugify(response.slug);
    } catch {
      return undefined;
    }
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
