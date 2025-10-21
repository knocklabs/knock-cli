/*
 * IMPORTANT:
 *
 * This file is suffixed with `.isomorphic` because the code in this file is
 * meant to run not just in a nodejs environment but also in a browser. For this
 * reason there are some restrictions for which nodejs imports are allowed in
 * this module. See `.eslintrc.json` for more details.
 */
import { cloneDeep, get, has, set, unset } from "lodash";

import { AnyObj } from "@/lib/helpers/object.isomorphic";
import { ObjKeyOrArrayIdx, ObjPath } from "@/lib/helpers/object.isomorphic";
import { FILEPATH_MARKER } from "@/lib/marshal/shared/const.isomorphic";
import { ExtractionSettings, WithAnnotation } from "@/lib/marshal/shared/types";

import { prepareResourceJson } from "../shared/helpers.isomorphic";
import { GuideData } from "./types";

export const GUIDE_JSON = "guide.json";

export type GuideDirBundle = {
  [relpath: string]: string;
};

/*
 * Traverse the given guide data and compile extraction settings of every
 * extractable field into a sorted map.
 *
 * NOTE: Currently we do NOT support content extraction at nested levels for
 * guides.
 *
 * TODO: Abstract this helper and re-use where appropriate.
 */
type CompiledExtractionSettings = Map<ObjKeyOrArrayIdx[], ExtractionSettings>;

const compileExtractionSettings = (
  guide: GuideData<WithAnnotation>,
): CompiledExtractionSettings => {
  const extractableFields = get(
    guide,
    ["__annotation", "extractable_fields"],
    {},
  );
  const map: CompiledExtractionSettings = new Map();

  for (const [key] of Object.entries(guide)) {
    // If the field we are on is extractable, then add its extraction settings
    // to the map with the current object path.
    if (key in extractableFields) {
      map.set([key], extractableFields[key]);
    }
  }

  return map;
};

/*
 * For a given guide payload, this function builds a guide "directory bundle".
 */
export const buildGuideDirBundle = (
  remoteGuide: GuideData<WithAnnotation>,
  localGuide?: AnyObj,
  $schema?: string,
): GuideDirBundle => {
  const bundle: GuideDirBundle = {};
  localGuide = localGuide || {};
  const mutRemoteGuide = cloneDeep(remoteGuide);

  // A map of extraction settings of every field in the guide.
  const compiledExtractionSettings = compileExtractionSettings(mutRemoteGuide);

  // Iterate through each extractable field, determine whether we need to
  // extract the field content, and if so, perform the extraction.
  for (const [objPathParts, extractionSettings] of compiledExtractionSettings) {
    // If this field path does not exist, then we don't extract.
    if (!has(mutRemoteGuide, objPathParts)) continue;

    // If the field at this path is extracted in the local guide, then always
    // extract; otherwise extract based on the field settings default.
    const objPathStr = ObjPath.stringify(objPathParts);

    const extractedFilePath = get(
      localGuide,
      `${objPathStr}${FILEPATH_MARKER}`,
    );

    const { default: extractByDefault, file_ext: fileExt } = extractionSettings;

    if (!extractedFilePath && !extractByDefault) continue;

    // By this point, we have a field where we need to extract its content.
    const data = get(mutRemoteGuide, objPathParts);
    const fileName = objPathParts.pop();

    // If we have an extracted file path from the local guide, we use that;
    // otherwise use the default path.
    const relpath =
      typeof extractedFilePath === "string"
        ? extractedFilePath
        : `${fileName}.${fileExt}`;

    // Perform the extraction by adding the content and its file path to the
    // bundle for writing to the file system later. Then replace the field
    // content with the extracted file path and mark the field as extracted
    // with @ suffix.
    set(bundle, [relpath], data);
    set(mutRemoteGuide, `${objPathStr}${FILEPATH_MARKER}`, relpath);
    unset(mutRemoteGuide, objPathStr);
  }

  // At this point the bundle contains all extractable files, so we finally add
  // the guide JSON relative path + the file content.

  return set(
    bundle,
    [GUIDE_JSON],
    prepareResourceJson(mutRemoteGuide, $schema),
  );
};
