import * as path from "node:path";

import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
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
import * as Partial from "@/lib/marshal/partial";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import {
  ensureResourceDirForTarget,
  PartialDirContext,
  ResourceTarget,
} from "@/lib/run-context";

export default class PartialPull extends BaseCommand<typeof PartialPull> {
  static summary =
    "Pull one or more partial from an environment into a local file system.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to pull all partials from the specified environment.",
    }),
    "partials-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all partials into.",
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
    partialKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    if (flags.all && args.partialKey) {
      return this.error(
        `partialKey arg \`${args.partialKey}\` cannot also be provided when using --all`,
      );
    }

    return flags.all ? this.pullAllPartials() : this.pullOnePartial();
  }

  // Pull one partial
  async pullOnePartial(): Promise<void> {
    const { flags } = this.props;

    const dirContext = await this.getPartialDirContext();

    if (dirContext.exists) {
      this.log(`‣ Found \`${dirContext.key}\` at ${dirContext.abspath}`);
    } else {
      const prompt = `Create a new partial directory \`${dirContext.key}\` at ${dirContext.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    }

    const resp = await withSpinner<ApiV1.GetPartialResp<WithAnnotation>>(() => {
      const props = merge(this.props, {
        args: { partialKey: dirContext.key },
        flags: { annotate: true },
      });
      return this.apiV1.getPartial(props);
    });

    await Partial.writePartialDirFromData(dirContext, resp.data);

    const action = dirContext.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath} using ${scope}`,
    );
  }

  // Pull all partials
  async pullAllPartials(): Promise<void> {
    const { flags } = this.props;

    const defaultToCwd = { abspath: this.runContext.cwd, exists: true };
    const targetDirCtx = flags["partials-dir"] || defaultToCwd;

    const prompt = targetDirCtx.exists
      ? `Pull latest partials into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new partials directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    spinner.start(`‣ Loading`);

    const partials = await this.listAllPartials();

    await Partial.writePartialsIndexDir(targetDirCtx, partials);
    spinner.stop();

    const action = targetDirCtx.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} the partials directory at ${targetDirCtx.abspath} using ${scope}`,
    );
  }

  async listAllPartials(
    pageParams: Partial<PageInfo> = {},
    partialsFetchedSoFar: Partial.PartialData<WithAnnotation>[] = [],
  ): Promise<Partial.PartialData<WithAnnotation>[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        annotate: true,
        limit: MAX_PAGINATION_LIMIT,
      },
    });

    const resp = await this.apiV1.listPartials<WithAnnotation>(props);
    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const partials = [...partialsFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllPartials({ after: pageInfo.after }, partials)
      : partials;
  }

  async getPartialDirContext(): Promise<PartialDirContext> {
    const { partialKey } = this.props.args;
    const { resourceDir, cwd: runCwd } = this.runContext;

    // Inside an existing resource dir, use it if valid for the target partial.
    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: BaseCommand.id,
        type: "partial",
        key: partialKey,
      };

      return ensureResourceDirForTarget(
        resourceDir,
        target,
      ) as PartialDirContext;
    }

    // Not inside any existing partial directory, which means either create a
    // new partial directory in the cwd, or update it if there is one already.
    if (partialKey) {
      const dirPath = path.resolve(runCwd, partialKey);
      const exists = await Partial.isPartialDir(dirPath);

      return {
        type: "partial",
        key: partialKey,
        abspath: dirPath,
        exists,
      };
    }

    // Not in any partial directory, nor a partial key arg was given so error.
    return this.error("Missing 1 required arg:\npartialKey");
  }
}
