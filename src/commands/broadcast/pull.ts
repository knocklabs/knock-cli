import * as path from "node:path";

import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { MAX_PAGINATION_LIMIT } from "@/lib/helpers/page";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import {
  formatErrorRespMessage,
  isSuccessResp,
  withSpinner,
} from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Broadcast from "@/lib/marshal/broadcast";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import {
  BroadcastDirContext,
  ensureResourceDirForTarget,
  ResourceTarget,
} from "@/lib/run-context";

export default class BroadcastPull extends BaseCommand<typeof BroadcastPull> {
  static summary =
    "Pull one or more broadcasts from an environment into a local file system.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to pull all broadcasts from the specified environment.",
    }),
    "broadcasts-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all broadcasts into.",
      dependsOn: ["all"],
    }),
    force: Flags.boolean({
      summary: "Remove the confirmation prompt.",
    }),
  };

  static args = {
    broadcastKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    if (flags.all && args.broadcastKey) {
      return this.error(
        `broadcastKey arg \`${args.broadcastKey}\` cannot also be provided when using --all`,
      );
    }

    return flags.all ? this.pullAllBroadcasts() : this.pullOneBroadcast();
  }

  async pullOneBroadcast(): Promise<void> {
    const { flags } = this.props;

    const dirContext = await this.getBroadcastDirContext();

    if (dirContext.exists) {
      this.log(`‣ Found \`${dirContext.key}\` at ${dirContext.abspath}`);
    } else {
      const prompt = `Create a new broadcast directory \`${dirContext.key}\` at ${dirContext.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    }

    const resp = await withSpinner<ApiV1.GetBroadcastResp<WithAnnotation>>(
      () => {
        const props = merge(this.props, {
          args: { broadcastKey: dirContext.key },
          flags: { annotate: true },
        });
        return this.apiV1.getBroadcast(props);
      },
    );

    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    await Broadcast.writeBroadcastDirFromData(dirContext, resp.data, {
      withSchema: true,
    });

    const action = dirContext.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath} using ${scope}`,
    );
  }

  async pullAllBroadcasts(): Promise<void> {
    const { flags } = this.props;

    const broadcastsIndexDirCtx = await resolveResourceDir(
      this.projectConfig,
      "broadcast",
      this.runContext.cwd,
    );

    const targetDirCtx = flags["broadcasts-dir"] || broadcastsIndexDirCtx;

    const prompt = targetDirCtx.exists
      ? `Pull latest broadcasts into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new broadcasts directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    spinner.start(`‣ Loading`);

    const broadcasts = await this.listAllBroadcasts();

    await Broadcast.writeBroadcastsIndexDir(targetDirCtx, broadcasts, {
      withSchema: true,
    });
    spinner.stop();

    const action = targetDirCtx.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} the broadcasts directory at ${targetDirCtx.abspath} using ${scope}`,
    );
  }

  async listAllBroadcasts(
    pageParams: Record<string, unknown> = {},
    broadcastsFetchedSoFar: Broadcast.BroadcastData<WithAnnotation>[] = [],
  ): Promise<Broadcast.BroadcastData<WithAnnotation>[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        annotate: true,
        limit: MAX_PAGINATION_LIMIT,
      },
    });

    const resp = await this.apiV1.listBroadcasts<WithAnnotation>(props);
    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const broadcasts = [...broadcastsFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllBroadcasts({ after: pageInfo.after }, broadcasts)
      : broadcasts;
  }

  async getBroadcastDirContext(): Promise<BroadcastDirContext> {
    const { broadcastKey } = this.props.args;
    const { resourceDir, cwd: runCwd } = this.runContext;

    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: this.id ?? "broadcast:pull",
        type: "broadcast",
        key: broadcastKey,
      };

      return ensureResourceDirForTarget(
        resourceDir,
        target,
      ) as BroadcastDirContext;
    }

    const broadcastsIndexDirCtx = await resolveResourceDir(
      this.projectConfig,
      "broadcast",
      runCwd,
    );

    if (broadcastKey) {
      const dirPath = path.resolve(broadcastsIndexDirCtx.abspath, broadcastKey);
      const exists = await Broadcast.isBroadcastDir(dirPath);

      return {
        type: "broadcast",
        key: broadcastKey,
        abspath: dirPath,
        exists,
      };
    }

    return this.error("Missing 1 required arg:\nbroadcastKey");
  }
}
