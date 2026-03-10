import * as path from "node:path";

import { Args, Flags, ux } from "@oclif/core";

import BaseCommand from "@/lib/base-command";
import { formatCommandScope } from "@/lib/helpers/command";
import { ApiError } from "@/lib/helpers/error";
import * as CustomFlags from "@/lib/helpers/flag";
import { resolveResourceDir } from "@/lib/helpers/project-config";
import { promptToConfirm, spinner } from "@/lib/helpers/ux";
import * as AudienceMarshal from "@/lib/marshal/audience";
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

    spinner.start("‣ Loading");

    try {
      const audience = await this.apiV1.mgmtClient.audiences.retrieve(
        dirContext.key,
        {
          environment: flags.environment,
          branch: flags.branch,
          annotate: true,
          hide_uncommitted_changes: flags["hide-uncommitted-changes"],
        },
      );

      spinner.stop();

      // The SDK doesn't include annotation types, but the API returns them when annotate=true
      await AudienceMarshal.writeAudienceDirFromData(
        dirContext,
        audience as AudienceMarshal.AudienceData<WithAnnotation>,
        { withSchema: true },
      );

      const action = dirContext.exists ? "updated" : "created";
      const scope = formatCommandScope(flags);
      this.log(
        `‣ Successfully ${action} \`${dirContext.key}\` at ${dirContext.abspath} using ${scope}`,
      );
    } catch (error) {
      spinner.stop();
      ux.error(new ApiError((error as Error).message));
    }
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

    try {
      const audiences = await this.listAllAudiences();

      // The SDK doesn't include annotation types, but the API returns them when annotate=true
      await AudienceMarshal.writeAudiencesIndexDir(
        targetDirCtx,
        audiences as AudienceMarshal.AudienceData<WithAnnotation>[],
        { withSchema: true },
      );
      spinner.stop();

      const action = targetDirCtx.exists ? "updated" : "created";
      const scope = formatCommandScope(flags);
      this.log(
        `‣ Successfully ${action} the audiences directory at ${targetDirCtx.abspath} using ${scope}`,
      );
    } catch (error) {
      spinner.stop();
      ux.error(new ApiError((error as Error).message));
    }
  }

  async listAllAudiences(): Promise<AudienceMarshal.AudienceData<WithAnnotation>[]> {
    const { flags } = this.props;
    const audiences: AudienceMarshal.AudienceData<WithAnnotation>[] = [];

    for await (const audience of this.apiV1.mgmtClient.audiences.list({
      environment: flags.environment,
      branch: flags.branch,
      annotate: true,
      hide_uncommitted_changes: flags["hide-uncommitted-changes"],
    })) {
      // The SDK doesn't include annotation types, but the API returns them when annotate=true
      audiences.push(audience as AudienceMarshal.AudienceData<WithAnnotation>);
    }

    return audiences;
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
      const exists = await AudienceMarshal.isAudienceDir(dirPath);

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
