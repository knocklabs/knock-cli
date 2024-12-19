import * as path from "node:path";

import * as fs from "fs-extra";
import { uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { WithAnnotation } from "@/lib/marshal/shared/types";
import { MessageTypeDirContext } from "@/lib/run-context";

import { isMessageTypeDir } from "./helpers";
import {
  buildMessageTypeDirBundle,
  MESSAGE_TYPE_JSON,
  MessageTypeDirBundle,
} from "./processor.isomorphic";
import { readMessageTypeDir } from "./reader";
import { MessageTypeData } from "./types";

/*
 * The main write function that takes the fetched message type data from Knock
 * API (remote message type), and reads the same message type from the local file
 * system (local message type, if available), then writes the remote message type
 * into a message type directory with the local message type as a reference.
 */
export const writeMessageTypeDirFromData = async (
  messageTypeDirCtx: MessageTypeDirContext,
  remoteMessageType: MessageTypeData<WithAnnotation>,
): Promise<void> => {
  // If the message type directory exists on the file system (i.e. previously
  // pulled before), then read the message type file to use as a reference.
  const [localMessageType] = messageTypeDirCtx.exists
    ? await readMessageTypeDir(messageTypeDirCtx, { withExtractedFiles: true })
    : [];

  const bundle = buildMessageTypeDirBundle(remoteMessageType, localMessageType);

  return writeMessageTypeDirFromBundle(messageTypeDirCtx, bundle);
};

/*
 * A lower level write function that takes a constructed message type dir bundle
 * and writes it into a message type directory on a local file system.
 *
 * It does not make any assumptions about how the message type directory bundle
 * was built; for example, it can be from parsing the message type data fetched
 * from the Knock API, or built manually for scaffolding purposes.
 */
const writeMessageTypeDirFromBundle = async (
  messageTypeDirCtx: MessageTypeDirContext,
  messageTypeDirBundle: MessageTypeDirBundle,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (messageTypeDirCtx.exists) {
      await fs.copy(messageTypeDirCtx.abspath, backupDirPath);
      await fs.emptyDir(messageTypeDirCtx.abspath);
    }

    const promises = Object.entries(messageTypeDirBundle).map(
      ([relpath, fileContent]) => {
        const filePath = path.resolve(messageTypeDirCtx.abspath, relpath);

        return relpath === MESSAGE_TYPE_JSON
          ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
          : fs.outputFile(filePath, fileContent ?? "");
      },
    );
    await Promise.all(promises);
  } catch (error) {
    // In case of any error, wipe the target directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (messageTypeDirCtx.exists) {
      await fs.emptyDir(messageTypeDirCtx.abspath);
      await fs.copy(backupDirPath, messageTypeDirCtx.abspath);
    } else {
      await fs.remove(messageTypeDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

/*
 * Prunes the index directory by removing any files, or directories that aren't
 * message type dirs found in fetched message types. We want to preserve any
 * message type dirs that are going to be updated with remote message types, so
 * extracted links can be respected.
 */
const pruneMessageTypesIndexDir = async (
  indexDirCtx: DirContext,
  remoteMessageTypes: MessageTypeData<WithAnnotation>[],
): Promise<void> => {
  const messageTypesByKey = Object.fromEntries(
    remoteMessageTypes.map((w) => [w.key.toLowerCase(), w]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });

  const promises = dirents.map(async (dirent) => {
    const direntName = dirent.name.toLowerCase();
    const direntPath = path.resolve(indexDirCtx.abspath, direntName);

    if ((await isMessageTypeDir(direntPath)) && messageTypesByKey[direntName]) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

/*
 * The bulk write function that takes the fetched message types data from Knock
 * API (remote message types), and writes them into a message types "index"
 * directory by referencing locally available message types.
 */
export const writeMessageTypesIndexDir = async (
  indexDirCtx: DirContext,
  remoteMessageTypes: MessageTypeData<WithAnnotation>[],
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    // If the index directory already exists, back it up in the temp sandbox
    // before wiping it clean.
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await pruneMessageTypesIndexDir(indexDirCtx, remoteMessageTypes);
    }

    // Write given remote message types into the given message types dir path.
    const promises = remoteMessageTypes.map(async (messageType) => {
      const messageTypeDirPath = path.resolve(
        indexDirCtx.abspath,
        messageType.key,
      );

      const messageTypeDirCtx: MessageTypeDirContext = {
        type: "message_type",
        key: messageType.key,
        abspath: messageTypeDirPath,
        exists: indexDirCtx.exists
          ? await isMessageTypeDir(messageTypeDirPath)
          : false,
      };

      return writeMessageTypeDirFromData(messageTypeDirCtx, messageType);
    });

    await Promise.all(promises);
  } catch (error) {
    console.log(error);
    // In case of any error, wipe the index directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (indexDirCtx.exists) {
      await fs.emptyDir(indexDirCtx.abspath);
      await fs.copy(backupDirPath, indexDirCtx.abspath);
    } else {
      await fs.remove(indexDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

// Exported for tests.
export { pruneMessageTypesIndexDir };
