import * as path from "node:path";

import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge, omitDeep } from "@/lib/helpers/object.isomorphic";
import { MAX_PAGINATION_LIMIT, PageInfo } from "@/lib/helpers/page";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import {
  formatErrorRespMessage,
  isSuccessResp,
  withSpinner,
} from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as ReusableRequest from "@/lib/marshal/reusable-request";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import {
  ensureResourceDirForTarget,
  ResourceTarget,
  ReusableRequestDirContext,
} from "@/lib/run-context";

export default class ReusableRequestPull extends BaseCommand<
  typeof ReusableRequestPull
> {
  static summary =
    "Pull one or more reusable requests from an environment into a local file system.";

  static flags = {
    environment: CustomFlags.environment,
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary:
        "Whether to pull all reusable requests from the specified environment.",
    }),
    "reusable-requests-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all reusable requests into.",
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
    reusableRequestKey: Args.string({
      required: false,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<
    | ReusableRequest.ReusableRequestData<WithAnnotation>
    | ReusableRequest.ReusableRequestData<WithAnnotation>[]
    | void
  > {
    const { args, flags } = this.props;

    if (flags.all && args.reusableRequestKey) {
      return this.error(
        `reusableRequestKey arg \`${args.reusableRequestKey}\` cannot also be provided when using --all`,
      );
    }

    return flags.all
      ? this.pullAllReusableRequests()
      : this.pullOneReusableRequest();
  }

  async pullOneReusableRequest(): Promise<ReusableRequest.ReusableRequestData<WithAnnotation> | void> {
    const { flags } = this.props;

    const dirContext = await this.getReusableRequestDirContext();

    if (dirContext.exists) {
      if (!flags.json) {
        this.log(`‣ Found \`${dirContext.key}\` at ${dirContext.abspath}`);
      }
    } else {
      const prompt = `Create a new reusable request directory \`${dirContext.key}\` at ${dirContext.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    }

    const resp = await withSpinner<
      ApiV1.GetReusableRequestResp<WithAnnotation>
    >(() => {
      const props = merge(this.props, {
        args: { reusableRequestKey: dirContext.key },
        flags: { annotate: true },
      });
      return this.apiV1.getReusableRequest(props);
    });

    await ReusableRequest.writeReusableRequestDirFromData(
      dirContext,
      resp.data,
    );

    const action = dirContext.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    const message = `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath} using ${scope}`;

    if (flags.json) return omitDeep(resp.data, ["__annotation"]);

    this.log(message);
  }

  async pullAllReusableRequests(): Promise<
    ReusableRequest.ReusableRequestData<WithAnnotation>[] | void
  > {
    const { flags } = this.props;

    const reusableRequestsIndexDirCtx = await resolveResourceDir(
      this.projectConfig,
      "reusable_request",
      this.runContext.cwd,
    );

    const targetDirCtx =
      flags["reusable-requests-dir"] || reusableRequestsIndexDirCtx;

    const prompt = targetDirCtx.exists
      ? `Pull latest reusable requests into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new reusable requests directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    spinner.start(`‣ Loading`);

    const reusableRequests = await this.listAllReusableRequests();

    await ReusableRequest.writeReusableRequestsIndexDir(
      targetDirCtx,
      reusableRequests,
    );
    spinner.stop();

    const action = targetDirCtx.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);

    if (flags.json) return omitDeep(reusableRequests, ["__annotation"]);

    this.log(
      `‣ Successfully ${action} the reusable requests directory at ${targetDirCtx.abspath} using ${scope}`,
    );
  }

  async listAllReusableRequests(
    pageParams: Partial<PageInfo> = {},
    fetchedSoFar: ReusableRequest.ReusableRequestData<WithAnnotation>[] = [],
  ): Promise<ReusableRequest.ReusableRequestData<WithAnnotation>[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        annotate: true,
        limit: MAX_PAGINATION_LIMIT,
      },
    });

    const resp = await this.apiV1.listReusableRequests<WithAnnotation>(props);
    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const reusableRequests = [...fetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllReusableRequests(
          { after: pageInfo.after },
          reusableRequests,
        )
      : reusableRequests;
  }

  async getReusableRequestDirContext(): Promise<ReusableRequestDirContext> {
    const { reusableRequestKey } = this.props.args;
    const { resourceDir, cwd: runCwd } = this.runContext;

    if (reusableRequestKey) {
      const keyError =
        ReusableRequest.validateReusableRequestKey(reusableRequestKey);
      if (keyError) {
        return this.error(
          `Invalid reusable request key \`${reusableRequestKey}\` (${keyError})`,
        );
      }
    }

    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: this.id ?? "reusable-request pull",
        type: "reusable_request",
        key: reusableRequestKey,
      };

      return ensureResourceDirForTarget(
        resourceDir,
        target,
      ) as ReusableRequestDirContext;
    }

    const reusableRequestsIndexDirCtx = await resolveResourceDir(
      this.projectConfig,
      "reusable_request",
      runCwd,
    );

    if (reusableRequestKey) {
      const dirPath = path.resolve(
        reusableRequestsIndexDirCtx.abspath,
        reusableRequestKey,
      );
      const exists = await ReusableRequest.isReusableRequestDir(dirPath);

      return {
        type: "reusable_request",
        key: reusableRequestKey,
        abspath: dirPath,
        exists,
      };
    }

    return this.error("Missing 1 required arg:\nreusableRequestKey");
  }
}
