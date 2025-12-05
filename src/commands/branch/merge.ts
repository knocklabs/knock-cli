import BaseCommand from "@/lib/base-command";
import { CustomArgs } from "@/lib/helpers/arg";

export default class BranchMerge extends BaseCommand<typeof BranchMerge> {
  static summary = "Merges a branch into the development environment.";

  static args = {
    slug: CustomArgs.slug({
      required: true,
      description: "The slug of the branch to delete",
    }),
  };

  async run(): Promise<void> {
    // TODO
  }
}
