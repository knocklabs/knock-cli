import path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";
import { hasIn, set } from "lodash";

import { formatErrors, JsonDataError, SourceError } from "@/lib/helpers/error";
import { ParseJsonResult, readJson } from "@/lib/helpers/json";
import {
  AnyObj,
  mapValuesDeep,
  ObjPath,
  omitDeep,
} from "@/lib/helpers/object.isomorphic";
import {
  readExtractedFileSync,
  validateExtractedFilePath,
} from "@/lib/marshal/shared/helpers";
import { MessageTypeDirContext } from "@/lib/run-context";

import { FILEPATH_MARKED_RE } from "../shared/const.isomorphic";
import {
  isMessageTypeDir,
  lsMessageTypeJson,
  MessageTypeCommandTarget,
} from "./helpers";
import { MESSAGE_TYPE_JSON } from "./processor.isomorphic";

// Hydrated message type directory context with its content.
export type MessageTypeDirData = MessageTypeDirContext & {
  content: AnyObj;
};

/*
 * For the given list of message type directory contexts, read each message type dir and
 * return message type directory data.
 */
const readMessageTypeDirs = async (
  messageTypeDirCtxs: MessageTypeDirContext[],
  opts: ReadMessageTypeDirOpts = {},
): Promise<[MessageTypeDirData[], SourceError[]]> => {
  const messageTypes: MessageTypeDirData[] = [];
  const errors: SourceError[] = [];

  for (const messageTypeDirCtx of messageTypeDirCtxs) {
    // eslint-disable-next-line no-await-in-loop
    const [messageType, readErrors] = await readMessageTypeDir(
      messageTypeDirCtx,
      opts,
    );

    if (readErrors.length > 0) {
      const messageTypeJsonPath = path.resolve(
        messageTypeDirCtx.abspath,
        MESSAGE_TYPE_JSON,
      );

      const e = new SourceError(formatErrors(readErrors), messageTypeJsonPath);
      errors.push(e);
      continue;
    }

    messageTypes.push({ ...messageTypeDirCtx, content: messageType! });
  }

  return [messageTypes, errors];
};

/*
 * The main read function that takes the message type directory context, then
 * reads the message type json from the file system and returns the message type
 * data obj.
 */
type ReadMessageTypeDirOpts = {
  withExtractedFiles?: boolean;
};

export const readMessageTypeDir = async (
  messageTypeDirCtx: MessageTypeDirContext,
  opts: ReadMessageTypeDirOpts = {},
): Promise<ParseJsonResult | JoinExtractedFilesResult> => {
  const { abspath } = messageTypeDirCtx;
  const { withExtractedFiles = false } = opts;

  const dirExists = await fs.pathExists(abspath);
  if (!dirExists) throw new Error(`${abspath} does not exist`);

  const messageTypeJsonPath = await lsMessageTypeJson(abspath);
  if (!messageTypeJsonPath)
    throw new Error(`${abspath} is not a message type directory`);

  const result = await readJson(messageTypeJsonPath);
  if (!result[0]) return result;

  let [messageTypeJson] = result;

  // Read-only fields were previously stored under "__readonly" in message type JSON files.
  // We remove these, in case we're reading a JSON file created by an older version of the CLI.
  messageTypeJson = omitDeep(messageTypeJson, ["__readonly"]);

  return withExtractedFiles
    ? joinExtractedFiles(messageTypeDirCtx, messageTypeJson)
    : [messageTypeJson, []];
};

type JoinExtractedFilesResult = [AnyObj, JsonDataError[]];

const joinExtractedFiles = async (
  messageTypeDirCtx: MessageTypeDirContext,
  messageTypeJson: AnyObj,
): Promise<JoinExtractedFilesResult> => {
  // Tracks any errors encountered during traversal. Mutated in place.
  const errors: JsonDataError[] = [];

  // Tracks each new valid extracted file path seen (rebased to be relative to
  // message_type.json) in the message type json node. Mutated in place, and used
  // to validate the uniqueness of an extracted path encountered.
  const uniqueFilePaths = {};

  mapValuesDeep(messageTypeJson, (relpath: string, key: string, parts) => {
    // If not marked with the @suffix, there's nothing to do.
    if (!FILEPATH_MARKED_RE.test(key)) return;

    const objPathToFieldStr = ObjPath.stringify(parts);
    const inlinObjPathStr = objPathToFieldStr.replace(FILEPATH_MARKED_RE, "");

    // If there is inlined content present already, then nothing more to do.
    if (hasIn(messageTypeJson, inlinObjPathStr)) return;

    // Check if the extracted path found at the current field path is valid
    const invalidFilePathError = validateExtractedFilePath(
      relpath,
      path.resolve(messageTypeDirCtx.abspath, MESSAGE_TYPE_JSON),
      uniqueFilePaths,
      objPathToFieldStr,
    );
    if (invalidFilePathError) {
      errors.push(invalidFilePathError);
      // Wipe the invalid file path in the node so the final message type json
      // object ends up with only valid file paths, this way message type writer
      // can see only valid file paths and use those when pulling.
      set(messageTypeJson, inlinObjPathStr, undefined);
      set(messageTypeJson, objPathToFieldStr, undefined);
      return;
    }

    // By this point we have a valid extracted file path, so attempt to read the file.
    const [content, readExtractedFileError] = readExtractedFileSync(
      relpath,
      messageTypeDirCtx,
      key,
    );

    if (readExtractedFileError) {
      errors.push(readExtractedFileError);

      // If there's an error, replace the extracted file path with the original one, and set the
      // inlined field path in message type object with empty content, so we know
      // we do not need to try inlining again.
      set(messageTypeJson, objPathToFieldStr, relpath);
      set(messageTypeJson, inlinObjPathStr, undefined);
      return;
    }

    // Inline the file content and remove the extracted file path.
    set(messageTypeJson, objPathToFieldStr, relpath);
    set(messageTypeJson, inlinObjPathStr, content);
  });

  return [messageTypeJson, errors];
};

/*
 * List and read all message type directories found for the given command target.
 *
 * Note, it assumes the valid command target.
 */
export const readAllForCommandTarget = async (
  target: MessageTypeCommandTarget,
  opts: ReadMessageTypeDirOpts = {},
): Promise<[MessageTypeDirData[], SourceError[]]> => {
  const { type: targetType, context: targetCtx } = target;

  if (!targetCtx.exists) {
    const subject =
      targetType === "messageTypeDir"
        ? "a message type directory at"
        : "message type directories in";

    return ux.error(`Cannot locate ${subject} \`${targetCtx.abspath}\``);
  }

  switch (targetType) {
    case "messageTypeDir": {
      return readMessageTypeDirs([targetCtx], opts);
    }

    case "messageTypesIndexDir": {
      const dirents = await fs.readdir(targetCtx.abspath, {
        withFileTypes: true,
      });

      const promises = dirents.map(async (dirent) => {
        const abspath = path.resolve(targetCtx.abspath, dirent.name);
        const messageTypeDirCtx: MessageTypeDirContext = {
          type: "message_type",
          key: dirent.name,
          abspath,
          exists: await isMessageTypeDir(abspath),
        };
        return messageTypeDirCtx;
      });

      const messageTypeDirCtxs = (await Promise.all(promises)).filter(
        (messageTypeDirCtx) => messageTypeDirCtx.exists,
      );
      return readMessageTypeDirs(messageTypeDirCtxs, opts);
    }

    default:
      throw new Error(`Invalid message type command target: ${target}`);
  }
};
