import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import {
  ProjectConfig,
  resolveResourceDir,
} from "@/lib/helpers/project-config";
import { EmailLayoutDirContext, RunContext } from "@/lib/run-context";

import { LAYOUT_JSON } from "./processor.isomorphic";

export const emailLayoutJsonPath = (
  layoutDirCtx: EmailLayoutDirContext,
): string => path.resolve(layoutDirCtx.abspath, LAYOUT_JSON);

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
type EmailLayoutDirTarget = {
  type: "emailLayoutDir";
  context: EmailLayoutDirContext;
};
type EmailLayoutsIndexDirTarget = {
  type: "emailLayoutsIndexDir";
  context: DirContext;
};

export type EmailLayoutCommandTarget =
  | EmailLayoutDirTarget
  | EmailLayoutsIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
  projectConfig?: ProjectConfig,
): Promise<EmailLayoutCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  // If the target resource is a different type than the current resource dir
  // type, error out.
  if (resourceDirCtx && resourceDirCtx.type !== "email_layout") {
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
    // Default to knock project config first if present, otherwise cwd.
    const defaultDir = await resolveResourceDir(
      projectConfig,
      "email_layout",
      runCwd,
    );

    const indexDirCtx = flags["layouts-dir"] || defaultDir;

    return { type: "emailLayoutsIndexDir", context: indexDirCtx };
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

    const layoutDirCtx: EmailLayoutDirContext = {
      type: "email_layout",
      key: args.emailLayoutKey,
      abspath: targetDirPath,
      exists: await isEmailLayoutDir(targetDirPath),
    };

    return { type: "emailLayoutDir", context: layoutDirCtx };
  }

  // From this point on, we have neither an email layout key arg nor --all flag.
  // If running inside a layout directory, then use that.
  if (resourceDirCtx) {
    return { type: "emailLayoutDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:emailLayoutKey");
};
