import { cloneDeep, get, has, set, unset } from "lodash";

import {
  AnyObj,
  ObjKeyOrArrayIdx,
  ObjPath,
} from "@/lib/helpers/object.isomorphic";
import { FILEPATH_MARKER } from "@/lib/marshal/shared/const.isomorphic";
import { ExtractionSettings, WithAnnotation } from "@/lib/marshal/shared/types";

import { prepareResourceJson } from "../shared/helpers.isomorphic";
import { AudienceData } from "./types";

export const AUDIENCE_JSON = "audience.json";

export type AudienceDirBundle = {
  [relpath: string]: string | Record<string, unknown>;
};

/*
 * Traverse a given audience data and compile extraction settings of every
 * extractable field into a sorted map.
 *
 * NOTE: Currently we do NOT support content extraction at nested levels for
 * audiences.
 */
type CompiledExtractionSettings = Map<ObjKeyOrArrayIdx[], ExtractionSettings>;

const compileExtractionSettings = (
  audience: AudienceData<WithAnnotation>,
): CompiledExtractionSettings => {
  const extractableFields = get(
    audience,
    ["__annotation", "extractable_fields"],
    {},
  );
  const map: CompiledExtractionSettings = new Map();

  for (const [key] of Object.entries(audience)) {
    if (key in extractableFields) {
      map.set([key], extractableFields[key]);
    }
  }

  return map;
};

/*
 * For a given audience payload, this function builds an "audience
 * directory bundle". This is an object which contains all the relative paths and
 * its file content. It includes the extractable fields, which are extracted out
 * and added to the bundle as separate files.
 */
export const buildAudienceDirBundle = (
  remoteAudience: AudienceData<WithAnnotation>,
  localAudience?: AnyObj,
  $schema?: string,
): AudienceDirBundle => {
  const bundle: AudienceDirBundle = {};
  localAudience = localAudience || {};
  const mutRemoteAudience = cloneDeep(remoteAudience);
  const compiledExtractionSettings =
    compileExtractionSettings(mutRemoteAudience);

  for (const [objPathParts, extractionSettings] of compiledExtractionSettings) {
    if (!has(mutRemoteAudience, objPathParts)) continue;

    const objPathStr = ObjPath.stringify(objPathParts);

    const extractedFilePath = get(
      localAudience,
      `${objPathStr}${FILEPATH_MARKER}`,
    );

    const { default: extractByDefault, file_ext: fileExt } = extractionSettings;

    if (!extractedFilePath && !extractByDefault) continue;

    const data = get(mutRemoteAudience, objPathParts);
    const fileName = objPathParts.pop();

    const relpath =
      typeof extractedFilePath === "string"
        ? extractedFilePath
        : `${fileName}.${fileExt}`;

    set(bundle, [relpath], data);
    set(mutRemoteAudience, `${objPathStr}${FILEPATH_MARKER}`, relpath);
    unset(mutRemoteAudience, objPathStr);
  }

  return set(
    bundle,
    [AUDIENCE_JSON],
    prepareResourceJson(mutRemoteAudience, $schema),
  );
};
