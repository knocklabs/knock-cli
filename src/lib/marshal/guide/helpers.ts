import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import { checkSlugifiedFormat } from "@/lib/helpers/string";
import { GuideDirContext, RunContext } from "@/lib/run-context";

import { GUIDE_JSON } from "./processor.isomorphic";
import { GuideActivationLocationRule, GuideData, GuideStepData } from "./types";

export const formatStatusWithSchedule = (guide: GuideData): string => {
  const baseStatus = guide.active ? "Active" : "Inactive";

  if (guide.active_from || guide.active_until) {
    const fromText = guide.active_from
      ? `from ${guide.active_from}`
      : "immediately";
    const untilText = guide.active_until
      ? `until ${guide.active_until}`
      : "with no end time";
    return `${baseStatus} (${fromText} ${untilText})`;
  }

  return baseStatus;
};

export const formatStep = (step: GuideStepData): string => {
  return `${step.schema_key} (${step.schema_variant_key})`;
};

export const formatActivationRules = (
  rules?: GuideActivationLocationRule[],
): string => {
  if (!rules || !Array.isArray(rules)) return "-";

  return rules
    .map(({ directive, pathname }) => `${directive} ${pathname}`)
    .join(", ");
};

export const guideJsonPath = (guideDirCtx: GuideDirContext): string =>
  path.resolve(guideDirCtx.abspath, GUIDE_JSON);

/*
 * Validates a string input for a guide key, and returns an error reason
 * if invalid.
 */
export const validateGuideKey = (input: string): string | undefined => {
  if (!checkSlugifiedFormat(input, { onlyLowerCase: true })) {
    return "must include only lowercase alphanumeric, dash, or underscore characters";
  }

  return undefined;
};

/*
 * Check for guide.json file and return the file path if present.
 */
export const lsGuideJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const guideJsonPath = path.resolve(dirPath, GUIDE_JSON);

  const exists = await fs.pathExists(guideJsonPath);
  return exists ? guideJsonPath : undefined;
};

/*
 * Evaluates whether the given directory path is a guide directory, by
 * checking for the presence of guide.json file.
 */
export const isGuideDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsGuideJson(dirPath));

/*
 * Validate the provided args and flags with the current run context, to first
 * ensure the invoked command makes sense, and return the target context.
 */
type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "guides-dir": DirContext | undefined;
  };
  args: {
    guideKey: string | undefined;
  };
};

type GuideDirTarget = {
  type: "guideDir";
  context: GuideDirContext;
};

type GuidesIndexDirTarget = {
  type: "guidesIndexDir";
  context: DirContext;
};

export type GuideCommandTarget = GuideDirTarget | GuidesIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
): Promise<GuideCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  // If the target resource is a different type than the current resource dir
  // type, error out.
  if (resourceDirCtx && resourceDirCtx.type !== "guide") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  // Cannot accept both guide key arg and --all flag.
  if (flags.all && args.guideKey) {
    return ux.error(
      `guideKey arg \`${args.guideKey}\` cannot also be provided when using --all`,
    );
  }

  // --all flag is given, which means no guide key arg.
  if (flags.all) {
    // If --all flag used inside a guide directory, then require a guides
    // dir path.
    if (resourceDirCtx && !flags["guides-dir"]) {
      return ux.error("Missing required flag guides-dir");
    }

    // Targeting all guide dirs in the guides index dir.
    // TODO: Default to the knock project config first if present before cwd.
    const defaultToCwd = { abspath: runCwd, exists: true };
    const indexDirCtx = flags["guides-dir"] || defaultToCwd;

    return { type: "guidesIndexDir", context: indexDirCtx };
  }

  // Guide key arg is given, which means no --all flag.
  if (args.guideKey) {
    if (resourceDirCtx && resourceDirCtx.key !== args.guideKey) {
      return ux.error(
        `Cannot run ${commandId} \`${args.guideKey}\` inside another guide directory:\n${resourceDirCtx.key}`,
      );
    }

    const targetDirPath = resourceDirCtx
      ? resourceDirCtx.abspath
      : path.resolve(runCwd, args.guideKey);

    const guideDirCtx: GuideDirContext = {
      type: "guide",
      key: args.guideKey,
      abspath: targetDirPath,
      exists: await isGuideDir(targetDirPath),
    };

    return { type: "guideDir", context: guideDirCtx };
  }

  // From this point on, we have neither a guide key arg nor --all flag.
  // If running inside a guide directory, then use that guide directory.
  if (resourceDirCtx) {
    return { type: "guideDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:\nguideKey");
};
