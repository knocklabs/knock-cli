import { cloneDeep, get, has, set, unset } from "lodash";

import { AnyObj } from "@/lib/helpers/object.isomorphic";
import { ObjKeyOrArrayIdx, ObjPath } from "@/lib/helpers/object.isomorphic";
import { FILEPATH_MARKER } from "@/lib/marshal/shared/const.isomorphic";
import { ExtractionSettings, WithAnnotation } from "@/lib/marshal/shared/types";

import { prepareResourceJson } from "../shared/helpers.isomorphic";
import { MessageTypeData } from "./types";

export const MESSAGE_TYPE_JSON = "message_type.json";

export type MessageTypeDirBundle = {
  [relpath: string]: string | Record<string, unknown>;
};

/*
 * Traverse a given message type data and compile extraction settings of every
 * extractable field into a sorted map.
 *
 * NOTE: Currently we do NOT support content extraction at nested levels for
 * message types.
 */
type CompiledExtractionSettings = Map<ObjKeyOrArrayIdx[], ExtractionSettings>;

const compileExtractionSettings = (
  messageType: MessageTypeData<WithAnnotation>,
): CompiledExtractionSettings => {
  const extractableFields = get(
    messageType,
    ["__annotation", "extractable_fields"],
    {},
  );
  const map: CompiledExtractionSettings = new Map();

  for (const [key] of Object.entries(messageType)) {
    // If the field we are on is extractable, then add its extraction settings
    // to the map with the current object path.
    if (key in extractableFields) {
      map.set([key], extractableFields[key]);
    }
  }

  return map;
};

/*
 * For a given message type payload, this function builds a message type
 * "directory bundle". This is an object which contains all the relative paths
 * and its file content. It includes the extractable fields, which are extracted
 * out and added to the bundle as separate files.
 */
export const buildMessageTypeDirBundle = (
  remoteMessageType: MessageTypeData<WithAnnotation>,
  localMessageType?: AnyObj,
  $schema?: string,
): MessageTypeDirBundle => {
  const bundle: MessageTypeDirBundle = {};
  const mutRemoteMessageType = cloneDeep(remoteMessageType);
  localMessageType = localMessageType || {};
  // A map of extraction settings of every field in the message type
  const compiledExtractionSettings =
    compileExtractionSettings(mutRemoteMessageType);

  // Iterate through each extractable field, determine whether we need to
  // extract the field content, and if so, perform the extraction.
  for (const [objPathParts, extractionSettings] of compiledExtractionSettings) {
    // If this message type doesn't have this field path, then we don't extract.
    if (!has(mutRemoteMessageType, objPathParts)) continue;

    // If the field at this path is extracted in the local message type, then
    // always extract; otherwise extract based on the field settings default.
    const objPathStr = ObjPath.stringify(objPathParts);

    const extractedFilePath = get(
      localMessageType,
      `${objPathStr}${FILEPATH_MARKER}`,
    );

    const { default: extractByDefault, file_ext: fileExt } = extractionSettings;

    if (!extractedFilePath && !extractByDefault) continue;

    // By this point, we have a field where we need to extract its content.
    const data = get(mutRemoteMessageType, objPathParts);
    const fileName = objPathParts.pop();

    // If we have an extracted file path from the local message type, we use
    // that.  In the other case we use the default path.
    const relpath =
      typeof extractedFilePath === "string"
        ? extractedFilePath
        : `${fileName}.${fileExt}`;

    // Perform the extraction by adding the content and its file path to the
    // bundle for writing to the file system later. Then replace the field
    // content with the extracted file path and mark the field as extracted
    // with @ suffix.
    set(bundle, [relpath], data);
    set(mutRemoteMessageType, `${objPathStr}${FILEPATH_MARKER}`, relpath);
    unset(mutRemoteMessageType, objPathStr);
  }

  // At this point the bundle contains all extractable files, so we finally add
  // the message type JSON relative path + the file content.

  return set(
    bundle,
    [MESSAGE_TYPE_JSON],
    prepareResourceJson(mutRemoteMessageType, $schema),
  );
};
