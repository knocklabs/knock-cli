import * as path from "node:path";

import { Args, Flags } from "@oclif/core";
import * as fs from "fs-extra";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import * as CustomFlags from "@/lib/helpers/flag";
import { withSpinner } from "@/lib/helpers/request";
import { promptToConfirm } from "@/lib/helpers/ux";

// Same directory name `knock pull` uses for this resource.
const LOCAL_REUSABLE_REQUESTS_DIR = "reusable-requests";
const REUSABLE_REQUEST_JSON = "reusable_request.json";

export default class ReusableRequestArchive extends BaseCommand<
  typeof ReusableRequestArchive
> {
  static summary = "Archive a reusable request (affects ALL environments).";

  static description = `
WARNING: Archiving a reusable request affects ALL environments and cannot be undone.
Use this command with caution.

If a local copy exists at <knock dir>/reusable-requests/<key>, that directory
is removed so a later push does not create the reusable request again.
`;

  static flags = {
    environment: Flags.string({
      required: true,
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    force: Flags.boolean({
      summary: "Skip confirmation prompt.",
    }),
  };

  static args = {
    reusableRequestKey: Args.string({
      required: true,
      description: "The key of the reusable request to archive.",
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<ApiV1.ArchiveReusableRequestResp | void> {
    const { reusableRequestKey } = this.props.args;
    const { force, json } = this.props.flags;

    if (json && !force) {
      this.error(
        "Pass --force to archive a reusable request when using --json.",
      );
    }

    const localDir = await this.localReusableRequestDir(reusableRequestKey);

    if (!force) {
      const localNote = localDir
        ? `\nThe local directory at ${localDir} will also be removed so a later push does not create it again.`
        : "";
      const confirmed = await promptToConfirm(
        `WARNING: Archiving reusable request \`${reusableRequestKey}\` will affect ALL environments.\n` +
          `This action cannot be undone.${localNote} Continue?`,
      );
      if (!confirmed) {
        this.error("Archive cancelled.");
      }
    }

    const resp = await withSpinner<ApiV1.ArchiveReusableRequestResp>(
      () => this.apiV1.archiveReusableRequest(this.props),
      { action: `‣ Archiving reusable request \`${reusableRequestKey}\`` },
    );

    const removedLocalDir = await this.removeLocalReusableRequestDir(localDir);

    if (json) {
      if (removedLocalDir && localDir) {
        this.warn(
          `Removed local directory at ${localDir} so a later push does not create it again.`,
        );
      }

      return resp.data;
    }

    this.log(
      `‣ Successfully archived reusable request \`${reusableRequestKey}\` across all environments.`,
    );

    if (removedLocalDir && localDir) {
      this.log(
        `‣ Removed local directory at ${localDir} so a later push does not create it again.`,
      );
    }
  }

  // A pulled reusable request lives at <knock dir>/reusable-requests/<key>.
  // Leaving it in place makes the next `knock push` create the request again.
  private async localReusableRequestDir(
    key: string,
  ): Promise<string | undefined> {
    const knockDir = this.projectConfig?.knockDir;
    if (!knockDir) return undefined;

    const dirPath = path.resolve(
      process.cwd(),
      knockDir,
      LOCAL_REUSABLE_REQUESTS_DIR,
      key,
    );
    const jsonPath = path.join(dirPath, REUSABLE_REQUEST_JSON);

    return (await fs.pathExists(jsonPath)) ? dirPath : undefined;
  }

  private async removeLocalReusableRequestDir(
    dirPath: string | undefined,
  ): Promise<boolean> {
    if (!dirPath) return false;

    try {
      await fs.remove(dirPath);
      return true;
    } catch (error) {
      this.warn(
        `Could not remove local directory at ${dirPath}. A later push will create this reusable request again. ${
          (error as Error).message
        }`,
      );
      return false;
    }
  }
}
