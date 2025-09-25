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
import { ReusableStepData } from "./types";

export const REUSABLE_STEP_JSON = "reusable_step.json";

export type ReusableStepDirBundle = {
  [relpath: string]: string;
};

/*
 * Traverse a given reusable step data and compile extraction settings of every
 * extractable field into a sorted map.
 *
 * NOTE: Currently we do NOT support content extraction at nested levels for
 * reusable steps.
 */
type CompiledExtractionSettings = Map<ObjKeyOrArrayIdx[], ExtractionSettings>;

const compileExtractionSettings = (
  reusableStep: ReusableStepData<WithAnnotation>,
): CompiledExtractionSettings => {
  const extractableFields = get(
    reusableStep,
    ["__annotation", "extractable_fields"],
    {},
  );
  const map: CompiledExtractionSettings = new Map();

  for (const key of Object.keys(reusableStep)) {
    // If the field we are on is extractable, then add its extraction
    // settings to the map with the current object path.
    if (key in extractableFields) {
      map.set([key], extractableFields[key]);
    }
  }

  return map;
};

/*
 * For a given reusable step payload, this function builds a "reusable step
 * directory bundle". This is an object which contains all the relative paths and
 * its file content. It includes the extractable fields, which are extracted out
 * and added to the bundle as separate files.
 */
export const buildReusableStepDirBundle = (
  remoteReusableStep: ReusableStepData<WithAnnotation>,
  localReusableStep: AnyObj = {},
): ReusableStepDirBundle => {
  const bundle: ReusableStepDirBundle = {};
  const mutRemoteReusableStep = cloneDeep(remoteReusableStep);
  // A map of extraction settings of every field in the reusable step
  const compiledExtractionSettings = compileExtractionSettings(
    mutRemoteReusableStep,
  );

  // Iterate through each extractable field, determine whether we need to
  // extract the field content, and if so, perform the extraction.
  for (const [objPathParts, extractionSettings] of compiledExtractionSettings) {
    // If this reusable step doesn't have this field path, then we don't extract.
    if (!has(mutRemoteReusableStep, objPathParts)) continue;

    // If the field at this path is extracted in the local reusable step, then
    // always extract; otherwise extract based on the field settings default.
    const objPathStr = ObjPath.stringify(objPathParts);

    const extractedFilePath = get(
      localReusableStep,
      `${objPathStr}${FILEPATH_MARKER}`,
    );

    const { default: extractByDefault, file_ext: fileExt } = extractionSettings;

    if (!extractedFilePath && !extractByDefault) continue;

    // By this point, we have a field where we need to extract its content.
    const data = get(mutRemoteReusableStep, objPathParts);
    const fileName = objPathParts.pop();

    // If we have an extracted file path from the local reusable step, we use that.
    // In the other case we use the default path.
    const relpath =
      typeof extractedFilePath === "string"
        ? extractedFilePath
        : `${fileName}.${fileExt}`;

    // Perform the extraction by adding the content and its file path to the
    // bundle for writing to the file system later. Then replace the field
    // content with the extracted file path and mark the field as extracted
    // with @ suffix.
    const content =
      typeof data === "string" ? data : JSON.stringify(data, null, 2);

    set(bundle, [relpath], content);
    set(mutRemoteReusableStep, `${objPathStr}${FILEPATH_MARKER}`, relpath);
    unset(mutRemoteReusableStep, objPathStr);
  }

  // At this point the bundle contains all extractable files, so we finally add
  // the reusable step JSON relative path + the file content.

  return set(
    bundle,
    [REUSABLE_STEP_JSON],
    prepareResourceJson(mutRemoteReusableStep),
  );
};
