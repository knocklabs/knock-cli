import { cloneDeep, get, has, set, unset } from "lodash";

import { AnyObj } from "@/lib/helpers/object.isomorphic";
import { ObjKeyOrArrayIdx, ObjPath } from "@/lib/helpers/object.isomorphic";
import { FILEPATH_MARKER } from "@/lib/marshal/shared/const.isomorphic";
import { ExtractionSettings, WithAnnotation } from "@/lib/marshal/shared/types";

import { prepareResourceJson } from "../shared/helpers.isomorphic";
import { EmailLayoutData } from "./types";

export const LAYOUT_JSON = "layout.json";

export type EmailLayoutDirBundle = {
  [relpath: string]: string;
};

/*
 * Traverse a given email layout data and compile extraction settings of every
 * extractable field into a sorted map.
 *
 * NOTE: Currently we do NOT support content extraction at nested levels for
 * email layouts.
 */
type CompiledExtractionSettings = Map<ObjKeyOrArrayIdx[], ExtractionSettings>;

const compileExtractionSettings = (
  emailLayout: EmailLayoutData<WithAnnotation>,
): CompiledExtractionSettings => {
  const extractableFields = get(
    emailLayout,
    ["__annotation", "extractable_fields"],
    {},
  );
  const map: CompiledExtractionSettings = new Map();

  for (const [key] of Object.entries(emailLayout)) {
    // If the field we are on is extractable, then add its extraction
    // settings to the map with the current object path.
    if (key in extractableFields) {
      map.set([key], extractableFields[key]);
    }
  }

  return map;
};

/*
 * For a given email layout payload, this function builds a "email layout
 * directoy bundle". This is an object which contains all the relative paths and
 * its file content. It includes the extractable fields, which are extracted out
 * and added to the bundle as separate files.
 */
export const buildEmailLayoutDirBundle = (
  remoteEmailLayout: EmailLayoutData<WithAnnotation>,
  localEmailLayout: AnyObj = {},
): EmailLayoutDirBundle => {
  const bundle: EmailLayoutDirBundle = {};
  const mutRemoteEmailLayout = cloneDeep(remoteEmailLayout);
  // A map of extraction settings of every field in the email layout
  const compiledExtractionSettings =
    compileExtractionSettings(mutRemoteEmailLayout);

  // Iterate through each extractable field, determine whether we need to
  // extract the field content, and if so, perform the
  // extraction.
  for (const [objPathParts, extractionSettings] of compiledExtractionSettings) {
    // If this layout doesn't have this field path, then we don't extract.
    if (!has(mutRemoteEmailLayout, objPathParts)) continue;

    // If the field at this path is extracted in the local layout, then
    // always extract; otherwise extract based on the field settings default.
    const objPathStr = ObjPath.stringify(objPathParts);

    const extractedFilePath = get(
      localEmailLayout,
      `${objPathStr}${FILEPATH_MARKER}`,
    );

    const { default: extractByDefault, file_ext: fileExt } = extractionSettings;

    if (!extractedFilePath && !extractByDefault) continue;

    // By this point, we have a field where we need to extract its content.
    const data = get(mutRemoteEmailLayout, objPathParts);
    const fileName = objPathParts.pop();

    // If we have an extracted file path from the local layout, we use that.
    // In the other case we use the default path.
    const relpath =
      typeof extractedFilePath === "string"
        ? extractedFilePath
        : `${fileName}.${fileExt}`;

    // Perform the extraction by adding the content and its file path to the
    // bundle for writing to the file system later. Then replace the field
    // content with the extracted file path and mark the field as extracted
    // with @ suffix.
    set(bundle, [relpath], data);
    set(mutRemoteEmailLayout, `${objPathStr}${FILEPATH_MARKER}`, relpath);
    unset(mutRemoteEmailLayout, objPathStr);
  }

  // At this point the bundle contains all extractable files, so we finally add
  // the layout JSON realtive path + the file content.

  return set(bundle, [LAYOUT_JSON], prepareResourceJson(mutRemoteEmailLayout));
};
