import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import {
  ProjectConfig,
  resolveResourceDir,
} from "@/lib/helpers/project-config";
import { PartialDirContext, RunContext } from "@/lib/run-context";

import { PARTIAL_JSON } from "./processor.isomorphic";

export const partialJsonPath = (partialDirCtx: PartialDirContext): string =>
  path.resolve(partialDirCtx.abspath, PARTIAL_JSON);

/*
 * Check for partial.json file and return the file path if present.
 */
export const lsPartialJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const partialJsonPath = path.resolve(dirPath, PARTIAL_JSON);

  const exists = await fs.pathExists(partialJsonPath);
  return exists ? partialJsonPath : undefined;
};

/*
 * Evaluates whether the given directory path is a partial directory, by
 * checking for the presence of partial.json file.
 */
export const isPartialDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsPartialJson(dirPath));

/*
 * Validate the provided args and flags with the current run context, to first
 * ensure the invoked command makes sense, and return the target context.
 */
type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "partials-dir": DirContext | undefined;
  };
  args: {
    partialKey: string | undefined;
  };
};
type PartialDirTarget = {
  type: "partialDir";
  context: PartialDirContext;
};
type PartialsIndexDirTarget = {
  type: "partialsIndexDir";
  context: DirContext;
};
export type PartialCommandTarget = PartialDirTarget | PartialsIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
  projectConfig?: ProjectConfig,
): Promise<PartialCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  // If the target resource is a different type than the current resource dir
  // type, error out.
  if (resourceDirCtx && resourceDirCtx.type !== "partial") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  // Cannot accept both partial key arg and --all flag.
  if (flags.all && args.partialKey) {
    return ux.error(
      `partialKey arg \`${args.partialKey}\` cannot also be provided when using --all`,
    );
  }

  // --all flag is given, which means no partial key arg.
  if (flags.all) {
    // If --all flag used inside a partial directory, then require a partials
    // dir path.
    if (resourceDirCtx && !flags["partials-dir"]) {
      return ux.error("Missing required flag partials-dir");
    }

    // Targeting all partial dirs in the partials index dir.
    // Default to knock project config first if present, otherwise cwd.
    const indexDirCtx = await resolveResourceDir(
      projectConfig,
      "partial",
      runCwd,
    );

    return {
      type: "partialsIndexDir",
      context: flags["partials-dir"] || indexDirCtx,
    };
  }

  // Partial key arg is given, which means no --all flag.
  if (args.partialKey) {
    if (resourceDirCtx && resourceDirCtx.key !== args.partialKey) {
      return ux.error(
        `Cannot run ${commandId} \`${args.partialKey}\` inside another partial directory:\n${resourceDirCtx.key}`,
      );
    }

    const targetDirPath = resourceDirCtx
      ? resourceDirCtx.abspath
      : path.resolve(runCwd, args.partialKey);

    const partialDirCtx: PartialDirContext = {
      type: "partial",
      key: args.partialKey,
      abspath: targetDirPath,
      exists: await isPartialDir(targetDirPath),
    };

    return { type: "partialDir", context: partialDirCtx };
  }

  // From this point on, we have neither a partial key arg nor --all flag.
  // If running inside a partial directory, then use that partial directory.
  if (resourceDirCtx) {
    return { type: "partialDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:\npartialKey");
};
