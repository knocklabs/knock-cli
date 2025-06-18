import * as path from "node:path";

import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { MAX_PAGINATION_LIMIT, PageInfo } from "@/lib/helpers/page";
import {
  formatErrorRespMessage,
  isSuccessResp,
  withSpinner,
} from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Guide from "@/lib/marshal/guide";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import {
  ensureResourceDirForTarget,
  GuideDirContext,
  ResourceTarget,
} from "@/lib/run-context";

export default class GuidePull extends BaseCommand<typeof GuidePull> {
  // Hide until guides are released in GA.
  static hidden = true;

  static summary =
    "Pull one or more guides from an environment into a local file system.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    all: Flags.boolean({
      summary: "Whether to pull all guides from the specified environment.",
    }),
    "guides-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all guides into.",
      dependsOn: ["all"],
    }),
    "hide-uncommitted-changes": Flags.boolean({
      summary: "Hide any uncommitted changes.",
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  static args = {
    guideKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    if (flags.all && args.guideKey) {
      return this.error(
        `guideKey arg \`${args.guideKey}\` cannot also be provided when using --all`,
      );
    }

    return flags.all ? this.pullAllGuides() : this.pullOneGuide();
  }

  async pullOneGuide(): Promise<void> {
    const { flags } = this.props;

    const dirContext = await this.getGuideDirContext();

    if (dirContext.exists) {
      this.log(`‣ Found \`${dirContext.key}\` at ${dirContext.abspath}`);
    } else {
      const prompt = `Create a new guide directory \`${dirContext.key}\` at ${dirContext.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    }

    const resp = await withSpinner<ApiV1.GetGuideResp<WithAnnotation>>(() => {
      const props = merge(this.props, {
        args: { guideKey: dirContext.key },
        flags: { annotate: true },
      });
      return this.apiV1.getGuide(props);
    });

    await Guide.writeGuideDirFromData(dirContext, resp.data);

    const action = dirContext.exists ? "updated" : "created";
    this.log(
      `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath}`,
    );
  }

  async pullAllGuides(): Promise<void> {
    const { flags } = this.props;

    const defaultToCwd = { abspath: this.runContext.cwd, exists: true };
    const targetDirCtx = flags["guides-dir"] || defaultToCwd;

    const prompt = targetDirCtx.exists
      ? `Pull latest guides into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new guides directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    spinner.start(`‣ Loading`);

    const guides = await this.listAllGuides();

    await Guide.writeGuidesIndexDir(targetDirCtx, guides);
    spinner.stop();

    const action = targetDirCtx.exists ? "updated" : "created";
    this.log(
      `‣ Successfully ${action} the guides directory at ${targetDirCtx.abspath}`,
    );
  }

  async listAllGuides(
    pageParams: Partial<PageInfo> = {},
    guidesFetchedSoFar: Guide.GuideData<WithAnnotation>[] = [],
  ): Promise<Guide.GuideData<WithAnnotation>[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        annotate: true,
        limit: MAX_PAGINATION_LIMIT,
      },
    });

    const resp = await this.apiV1.listGuides<WithAnnotation>(props);
    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const guides = [...guidesFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllGuides({ after: pageInfo.after }, guides)
      : guides;
  }

  async getGuideDirContext(): Promise<GuideDirContext> {
    const { guideKey } = this.props.args;
    const { resourceDir, cwd: runCwd } = this.runContext;

    // Inside an existing resource dir, use it if valid for the target guide.
    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: BaseCommand.id,
        type: "guide",
        key: guideKey,
      };

      return ensureResourceDirForTarget(resourceDir, target) as GuideDirContext;
    }

    // Not inside any existing guide directory, which means either create a
    // new guide directory in the cwd, or update it if there is one already.
    if (guideKey) {
      const dirPath = path.resolve(runCwd, guideKey);
      const exists = await Guide.isGuideDir(dirPath);

      return {
        type: "guide",
        key: guideKey,
        abspath: dirPath,
        exists,
      };
    }

    // Not in any guide directory, nor a guide key arg was given so error.
    return this.error("Missing 1 required arg:\nguideKey");
  }
}
