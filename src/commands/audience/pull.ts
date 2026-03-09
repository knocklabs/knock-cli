import * as path from "node:path";

import { Args, Flags } from "@oclif/core";

import * as ApiV1 from "@/lib/api-v1";
import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { merge } from "@/lib/helpers/object.isomorphic";
import { MAX_PAGINATION_LIMIT, PageInfo } from "@/lib/helpers/page";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import {
  formatErrorRespMessage,
  isSuccessResp,
  withSpinner,
} from "@/lib/helpers/request";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as Audience from "@/lib/marshal/audience";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import {
  AudienceDirContext,
  ensureResourceDirForTarget,
  ResourceTarget,
} from "@/lib/run-context";

export default class AudiencePull extends BaseCommand<typeof AudiencePull> {
  static summary =
    "Pull one or more audiences from an environment into a local file system.";

  static flags = {
    environment: Flags.string({
      default: "development",
      summary: "The environment to use.",
    }),
    branch: CustomFlags.branch,
    all: Flags.boolean({
      summary: "Whether to pull all audiences from the specified environment.",
    }),
    "audiences-dir": CustomFlags.dirPath({
      summary: "The target directory path to pull all audiences into.",
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
    audienceKey: Args.string({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = this.props;

    if (flags.all && args.audienceKey) {
      return this.error(
        `audienceKey arg \`${args.audienceKey}\` cannot also be provided when using --all`,
      );
    }

    return flags.all ? this.pullAllAudiences() : this.pullOneAudience();
  }

  // Pull one audience
  async pullOneAudience(): Promise<void> {
    const { flags } = this.props;

    const dirContext = await this.getAudienceDirContext();

    if (dirContext.exists) {
      this.log(`‣ Found \`${dirContext.key}\` at ${dirContext.abspath}`);
    } else {
      const prompt = `Create a new audience directory \`${dirContext.key}\` at ${dirContext.abspath}?`;
      const input = flags.force || (await promptToConfirm(prompt));
      if (!input) return;
    }

    const resp = await withSpinner<ApiV1.GetAudienceResp<WithAnnotation>>(
      () => {
        const props = merge(this.props, {
          args: { audienceKey: dirContext.key },
          flags: { annotate: true },
        });
        return this.apiV1.getAudience(props);
      },
    );

    await Audience.writeAudienceDirFromData(dirContext, resp.data, {
      withSchema: true,
    });

    const action = dirContext.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath} using ${scope}`,
    );
  }

  // Pull all audiences
  async pullAllAudiences(): Promise<void> {
    const { flags } = this.props;

    const audiencesIndexDirCtx = await resolveResourceDir(
      this.projectConfig,
      "audience",
      this.runContext.cwd,
    );

    const targetDirCtx = flags["audiences-dir"] || audiencesIndexDirCtx;

    const prompt = targetDirCtx.exists
      ? `Pull latest audiences into ${targetDirCtx.abspath}?\n  This will overwrite the contents of this directory.`
      : `Create a new audiences directory at ${targetDirCtx.abspath}?`;

    const input = flags.force || (await promptToConfirm(prompt));
    if (!input) return;

    spinner.start(`‣ Loading`);

    const audiences = await this.listAllAudiences();

    await Audience.writeAudiencesIndexDir(targetDirCtx, audiences, {
      withSchema: true,
    });
    spinner.stop();

    const action = targetDirCtx.exists ? "updated" : "created";
    const scope = formatCommandScope(flags);
    this.log(
      `‣ Successfully ${action} the audiences directory at ${targetDirCtx.abspath} using ${scope}`,
    );
  }

  async listAllAudiences(
    pageParams: Partial<PageInfo> = {},
    audiencesFetchedSoFar: Audience.AudienceData<WithAnnotation>[] = [],
  ): Promise<Audience.AudienceData<WithAnnotation>[]> {
    const props = merge(this.props, {
      flags: {
        ...pageParams,
        annotate: true,
        limit: MAX_PAGINATION_LIMIT,
      },
    });

    const resp = await this.apiV1.listAudiences<WithAnnotation>(props);
    if (!isSuccessResp(resp)) {
      const message = formatErrorRespMessage(resp);
      this.error(new ApiError(message));
    }

    const { entries, page_info: pageInfo } = resp.data;
    const audiences = [...audiencesFetchedSoFar, ...entries];

    return pageInfo.after
      ? this.listAllAudiences({ after: pageInfo.after }, audiences)
      : audiences;
  }

  async getAudienceDirContext(): Promise<AudienceDirContext> {
    const { audienceKey } = this.props.args;
    const { resourceDir, cwd: runCwd } = this.runContext;

    // Inside an existing resource dir, use it if valid for the target audience.
    if (resourceDir) {
      const target: ResourceTarget = {
        commandId: BaseCommand.id,
        type: "audience",
        key: audienceKey,
      };

      return ensureResourceDirForTarget(
        resourceDir,
        target,
      ) as AudienceDirContext;
    }

    const audiencesIndexDirCtx = await resolveResourceDir(
      this.projectConfig,
      "audience",
      runCwd,
    );

    // Not inside any existing audience directory, which means either create a
    // new audience directory in the cwd, or update it if there is one already.
    if (audienceKey) {
      const dirPath = path.resolve(audiencesIndexDirCtx.abspath, audienceKey);
      const exists = await Audience.isAudienceDir(dirPath);

      return {
        type: "audience",
        key: audienceKey,
        abspath: dirPath,
        exists,
      };
    }

    // Not in any audience directory, nor an audience key arg was given so error.
    return this.error("Missing 1 required arg:\naudienceKey");
  }
}
