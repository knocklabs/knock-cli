import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import { ReusableStepDirContext, RunContext } from "@/lib/run-context";

import { REUSABLE_STEP_JSON } from "./processor.isomorphic";

export const reusableStepJsonPath = (
  reusableStepDirCtx: ReusableStepDirContext,
): string => path.resolve(reusableStepDirCtx.abspath, REUSABLE_STEP_JSON);

/*
 * Evaluates whether the given directory path is a reusable step directory, by
 * checking for the presence of a `reusable-step.json` file.
 */
export const isReusableStepDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsReusableStepJson(dirPath));

/*
 * Check for `reusable-step.json` file and return the file path if present.
 */
export const lsReusableStepJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const reusableStepJsonPath = path.resolve(dirPath, REUSABLE_STEP_JSON);

  const exists = await fs.pathExists(reusableStepJsonPath);
  return exists ? reusableStepJsonPath : undefined;
};

/*
 * Validate the provided args and flags with the current run context, to first
 * ensure the invoked command makes sense, and return the target context.
 */
type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "reusable-steps-dir": DirContext | undefined;
  };
  args: {
    reusableStepKey: string | undefined;
  };
};

type ReusableStepDirTarget = {
  type: "reusableStepDir";
  context: ReusableStepDirContext;
};

type ReusableStepsIndexDirTarget = {
  type: "reusableStepsIndexDir";
  context: DirContext;
};

export type ReusableStepCommandTarget =
  | ReusableStepDirTarget
  | ReusableStepsIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
): Promise<ReusableStepCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  // If the target resource is a different type than the current resource dir
  // type, error out.
  if (resourceDirCtx && resourceDirCtx.type !== "reusable_step") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  // Cannot accept both reusable step key arg and --all flag.
  if (flags.all && args.reusableStepKey) {
    return ux.error(
      `reusableStepKey arg \`${args.reusableStepKey}\` cannot also be provided when using --all`,
    );
  }

  // --all flag is given, which means no reusable step key arg.
  if (flags.all) {
    // If --all flag used inside a reusable step directory, then require a reusable steps
    // dir path.
    if (resourceDirCtx && !flags["reusable-steps-dir"]) {
      return ux.error("Missing required flag reusable-steps-dir");
    }

    // Targeting all reusable step dirs in the reusable steps index dir.
    // TODO: Default to the knock project config first if present before cwd.
    const defaultToCwd = { abspath: runCwd, exists: true };
    const indexDirCtx = flags["reusable-steps-dir"] || defaultToCwd;

    return { type: "reusableStepsIndexDir", context: indexDirCtx };
  }

  // Reusable step key arg is given, which means no --all flag.
  if (args.reusableStepKey) {
    if (resourceDirCtx && resourceDirCtx.key !== args.reusableStepKey) {
      return ux.error(
        `Cannot run ${commandId} \`${args.reusableStepKey}\` inside another reusable step directory:\n${resourceDirCtx.key}`,
      );
    }

    const targetDirPath = resourceDirCtx
      ? resourceDirCtx.abspath
      : path.resolve(runCwd, args.reusableStepKey);

    const reusableStepDirCtx: ReusableStepDirContext = {
      type: "reusable_step",
      key: args.reusableStepKey,
      abspath: targetDirPath,
      exists: await isReusableStepDir(targetDirPath),
    };

    return { type: "reusableStepDir", context: reusableStepDirCtx };
  }

  // From this point on, we have neither a reusable step key arg nor --all flag.
  // If running inside a reusable step directory, then use that.
  if (resourceDirCtx) {
    return { type: "reusableStepDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:\nreusableStepKey");
};
