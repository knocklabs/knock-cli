import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import {
  ProjectConfig,
  resolveResourceDir,
} from "@/lib/helpers/project-config";
import { checkSlugifiedFormat } from "@/lib/helpers/string";
import { AudienceDirContext, RunContext } from "@/lib/run-context";

import { AUDIENCE_JSON } from "./processor.isomorphic";

export const audienceJsonPath = (audienceDirCtx: AudienceDirContext): string =>
  path.resolve(audienceDirCtx.abspath, AUDIENCE_JSON);

/*
 * Check for audience.json file and return the file path if present.
 */
export const lsAudienceJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const audienceJsonPath = path.resolve(dirPath, AUDIENCE_JSON);

  const exists = await fs.pathExists(audienceJsonPath);
  return exists ? audienceJsonPath : undefined;
};

/*
 * Evaluates whether the given directory path is an audience directory, by
 * checking for the presence of audience.json file.
 */
export const isAudienceDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsAudienceJson(dirPath));

/*
 * Validates a string input for an audience key, and returns an error reason
 * if invalid.
 */
export const validateAudienceKey = (input: string): string | undefined => {
  if (!checkSlugifiedFormat(input, { onlyLowerCase: true })) {
    return "must include only lowercase alphanumeric, dash, or underscore characters";
  }

  return undefined;
};

/*
 * Validate the provided args and flags with the current run context, to first
 * ensure the invoked command makes sense, and return the target context.
 */
type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "audiences-dir": DirContext | undefined;
  };
  args: {
    audienceKey: string | undefined;
  };
};
type AudienceDirTarget = {
  type: "audienceDir";
  context: AudienceDirContext;
};
type AudiencesIndexDirTarget = {
  type: "audiencesIndexDir";
  context: DirContext;
};
export type AudienceCommandTarget = AudienceDirTarget | AudiencesIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
  projectConfig?: ProjectConfig,
): Promise<AudienceCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  // If the target resource is a different type than the current resource dir
  // type, error out.
  if (resourceDirCtx && resourceDirCtx.type !== "audience") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  // Cannot accept both audience key arg and --all flag.
  if (flags.all && args.audienceKey) {
    return ux.error(
      `audienceKey arg \`${args.audienceKey}\` cannot also be provided when using --all`,
    );
  }

  // Default to knock project config first if present, otherwise cwd.
  const audiencesIndexDirCtx = await resolveResourceDir(
    projectConfig,
    "audience",
    runCwd,
  );

  // --all flag is given, which means no audience key arg.
  if (flags.all) {
    // If --all flag used inside an audience directory, then require an audiences
    // dir path.
    if (resourceDirCtx && !flags["audiences-dir"]) {
      return ux.error("Missing required flag audiences-dir");
    }

    return {
      type: "audiencesIndexDir",
      context: flags["audiences-dir"] || audiencesIndexDirCtx,
    };
  }

  // Audience key arg is given, which means no --all flag.
  if (args.audienceKey) {
    if (resourceDirCtx && resourceDirCtx.key !== args.audienceKey) {
      return ux.error(
        `Cannot run ${commandId} \`${args.audienceKey}\` inside another audience directory:\n${resourceDirCtx.key}`,
      );
    }

    const targetDirPath = resourceDirCtx
      ? resourceDirCtx.abspath
      : path.resolve(audiencesIndexDirCtx.abspath, args.audienceKey);

    const audienceDirCtx: AudienceDirContext = {
      type: "audience",
      key: args.audienceKey,
      abspath: targetDirPath,
      exists: await isAudienceDir(targetDirPath),
    };

    return { type: "audienceDir", context: audienceDirCtx };
  }

  // From this point on, we have neither an audience key arg nor --all flag.
  // If running inside an audience directory, then use that audience directory.
  if (resourceDirCtx) {
    return { type: "audienceDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:\naudienceKey");
};
