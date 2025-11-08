import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import {
  ProjectConfig,
  resolveResourceDir,
} from "@/lib/helpers/project-config";
import { MessageTypeDirContext, RunContext } from "@/lib/run-context";

import { MESSAGE_TYPE_JSON } from "./processor.isomorphic";

export const messageTypeJsonPath = (
  messageTypeDirCtx: MessageTypeDirContext,
): string => path.resolve(messageTypeDirCtx.abspath, MESSAGE_TYPE_JSON);

/*
 * Check for message_type.json file and return the file path if present.
 */
export const lsMessageTypeJson = async (
  dirPath: string,
): Promise<string | undefined> => {
  const messageTypeJsonPath = path.resolve(dirPath, MESSAGE_TYPE_JSON);

  const exists = await fs.pathExists(messageTypeJsonPath);
  return exists ? messageTypeJsonPath : undefined;
};

/*
 * Evaluates whether the given directory path is a message type directory, by
 * checking for the presence of message_type.json file.
 */
export const isMessageTypeDir = async (dirPath: string): Promise<boolean> =>
  Boolean(await lsMessageTypeJson(dirPath));

/*
 * Validate the provided args and flags with the current run context, to first
 * ensure the invoked command makes sense, and return the target context.
 */
type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "message-types-dir": DirContext | undefined;
  };
  args: {
    messageTypeKey: string | undefined;
  };
};
type MessageTypeDirTarget = {
  type: "messageTypeDir";
  context: MessageTypeDirContext;
};
type MessageTypesIndexDirTarget = {
  type: "messageTypesIndexDir";
  context: DirContext;
};
export type MessageTypeCommandTarget =
  | MessageTypeDirTarget
  | MessageTypesIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
  projectConfig?: ProjectConfig,
): Promise<MessageTypeCommandTarget> => {
  const { args, flags } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  // If the target resource is a different type than the current resource dir
  // type, error out.
  if (resourceDirCtx && resourceDirCtx.type !== "message_type") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  // Cannot accept both message type key arg and --all flag.
  if (flags.all && args.messageTypeKey) {
    return ux.error(
      `messageTypeKey arg \`${args.messageTypeKey}\` cannot also be provided when using --all`,
    );
  }

  // Default to knock project config first if present, otherwise cwd.
  const messageTypesIndexDirCtx = await resolveResourceDir(
    projectConfig,
    "message_type",
    runCwd,
  );

  // --all flag is given, which means no message type key arg.
  if (flags.all) {
    // If --all flag used inside a message type directory, then require a message
    // types dir path.
    if (resourceDirCtx && !flags["message-types-dir"]) {
      return ux.error("Missing required flag message-types-dir");
    }

    return {
      type: "messageTypesIndexDir",
      context: flags["message-types-dir"] || messageTypesIndexDirCtx,
    };
  }

  // Message type key arg is given, which means no --all flag.
  if (args.messageTypeKey) {
    if (resourceDirCtx && resourceDirCtx.key !== args.messageTypeKey) {
      return ux.error(
        `Cannot run ${commandId} \`${args.messageTypeKey}\` inside another message type directory:\n${resourceDirCtx.key}`,
      );
    }

    const targetDirPath = resourceDirCtx
      ? resourceDirCtx.abspath
      : path.resolve(messageTypesIndexDirCtx.abspath, args.messageTypeKey);

    const messageTypeDirCtx: MessageTypeDirContext = {
      type: "message_type",
      key: args.messageTypeKey,
      abspath: targetDirPath,
      exists: await isMessageTypeDir(targetDirPath),
    };

    return { type: "messageTypeDir", context: messageTypeDirCtx };
  }

  // From this point on, we have neither a message type key arg nor --all flag.
  // If running inside a message type directory, then use that message type
  // directory.
  if (resourceDirCtx) {
    return { type: "messageTypeDir", context: resourceDirCtx };
  }

  return ux.error("Missing 1 required arg:\nmessageTypeKey");
};
