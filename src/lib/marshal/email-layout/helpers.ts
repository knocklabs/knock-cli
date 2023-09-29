import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import { LayoutDirContext, RunContext } from "@/lib/run-context";

export const LAYOUT_JSON = "layout.json";

export type EmailLayoutFileContext = {
  key: string;
  abspath: string;
  exists: boolean;
};

export const emailLayoutJsonPath = (layoutDirCtx: LayoutDirContext): string =>
  path.resolve(layoutDirCtx.abspath, LAYOUT_JSON);

/*
 * Evaluates whether the given directory path is an email layout directory, by
 * checking for the presence of a `layout.json` file.
 */
export const isEmailLayoutDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsEmailLayoutJson(dirPath));

/*
 * Check for `layout.json` file and return the file path if present.
 */
export const lsEmailLayoutJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const emailLayoutJsonPath = path.resolve(dirPath, LAYOUT_JSON);

  const exists = await fs.pathExists(emailLayoutJsonPath);
  return exists ? emailLayoutJsonPath : undefined;
};

/*
 * Validate the provided args and flags with the current run context, to first
 * ensure the invoked command makes sense, and return the target context.
 */
type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "layouts-dir": DirContext | undefined;
  };
  args: {
    emailLayoutKey: string | undefined;
  };
};
type LayoutDirTarget = {
  type: "layoutDir";
  context: LayoutDirContext;
};
type LayoutsIndexDirTarget = {
  type: "layoutsIndexDir";
  context: DirContext;
};

export type LayoutCommandTarget = LayoutDirTarget | LayoutsIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
): Promise<LayoutCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  // If the target resource is a different type than the current resource dir
  // type, error out.
  if (resourceDirCtx && resourceDirCtx.type !== "layout") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  // Cannot accept both email layout key arg and --all flag.
  if (flags.all && args.emailLayoutKey) {
    return ux.error(
      `emailLayoutKey arg \`${args.emailLayoutKey}\` cannot also be provided when using --all`,
    );
  }

  // --all flag is given, which means no layout key arg.
  if (flags.all) {
    // If --all flag used inside a layout directory, then require a layouts dir path.
    if (resourceDirCtx && !flags["layouts-dir"]) {
      return ux.error("Missing required flag layouts-dir");
    }

    // Targeting all layout dirs in the layouts index dir.
    // TODO: Default to the knock project config first if present before cwd.
    const defaultToCwd = { abspath: runCwd, exists: true };
    const indexDirCtx = flags["layouts-dir"] || defaultToCwd;

    return { type: "layoutsIndexDir", context: indexDirCtx };
  }

  // Email layout key arg is given, which means no --all flag.
  if (args.emailLayoutKey) {
    if (resourceDirCtx && resourceDirCtx.key !== args.emailLayoutKey) {
      return ux.error(
        `Cannot run ${commandId} \`${args.emailLayoutKey}\` inside another layout directory:\n${resourceDirCtx.key}`,
      );
    }

    const targetDirPath = resourceDirCtx
      ? resourceDirCtx.abspath
      : path.resolve(runCwd, args.emailLayoutKey);

    const layoutDirCtx: LayoutDirContext = {
      type: "layout",
      key: args.emailLayoutKey,
      abspath: targetDirPath,
      exists: await isEmailLayoutDir(targetDirPath),
    };

    return { type: "layoutDir", context: layoutDirCtx };
  }

  // From this point on, we have neither an email layout key arg nor --all flag.
  // If running inside a layout directory, then use that.
  if (resourceDirCtx) {
    return { type: "layoutDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:emailLayoutKey");
};
