import { cloneDeep, get, has, set, unset } from "lodash";

import { AnyObj } from "@/lib/helpers/object.isomorphic";
import { ObjKeyOrArrayIdx, ObjPath } from "@/lib/helpers/object.isomorphic";
import { FILEPATH_MARKER } from "@/lib/marshal/shared/const.isomorphic";
import { ExtractionSettings, WithAnnotation } from "@/lib/marshal/shared/types";

import { prepareResourceJson } from "../shared/helpers.isomorphic";
import { PartialData, PartialType } from "./types";

export const PARTIAL_JSON = "partial.json";

export type PartialDirBundle = {
  [relpath: string]: string;
};

// Maps the partial type to the correct file extension. Defaults to 'txt'
const partialTypeToFileExt = (type: PartialType): string => {
  switch (type) {
    case PartialType.Html:
      return "html";
    case PartialType.Json:
      return "json";
    case PartialType.Markdown:
      return "md";
    case PartialType.Text:
    default:
      return "txt";
  }
};

/*
 * Traverse a given partial data and compile extraction settings of every
 * extractable field into a sorted map.
 *
 * NOTE: Currently we do NOT support content extraction at nested levels for
 * partials.
 */
type CompiledExtractionSettings = Map<ObjKeyOrArrayIdx[], ExtractionSettings>;

const compileExtractionSettings = (
  partial: PartialData<WithAnnotation>,
): CompiledExtractionSettings => {
  const extractableFields = get(
    partial,
    ["__annotation", "extractable_fields"],
    {},
  );
  const map: CompiledExtractionSettings = new Map();

  for (const key of Object.keys(partial)) {
    // If the field we are on is extractable, then add its extraction
    // settings to the map with the current object path.
    //
    // NOTE: Partial content type is dynamically set based on the partial type
    // rather than being explicitly set in the annotation.
    if (key in extractableFields) {
      const file_ext = partialTypeToFileExt(partial.type);
      const extractable_settings = { ...extractableFields[key], file_ext };
      map.set([key], extractable_settings);
    }
  }

  return map;
};

/*
 * For a given partial payload, this function builds a "partial
 * directory bundle". This is an object which contains all the relative paths and
 * its file content. It includes the extractable fields, which are extracted out
 * and added to the bundle as separate files.
 */
export const buildPartialDirBundle = (
  remotePartial: PartialData<WithAnnotation>,
  localPartial: AnyObj = {},
  $schema?: string,
): PartialDirBundle => {
  const bundle: PartialDirBundle = {};
  const mutRemotePartial = cloneDeep(remotePartial);
  // A map of extraction settings of every field in the partial
  const compiledExtractionSettings =
    compileExtractionSettings(mutRemotePartial);

  // Iterate through each extractable field, determine whether we need to
  // extract the field content, and if so, perform the extraction.
  for (const [objPathParts, extractionSettings] of compiledExtractionSettings) {
    // If this partial doesn't have this field path, then we don't extract.
    if (!has(mutRemotePartial, objPathParts)) continue;

    // If the field at this path is extracted in the local partial, then
    // always extract; otherwise extract based on the field settings default.
    const objPathStr = ObjPath.stringify(objPathParts);

    const extractedFilePath = get(
      localPartial,
      `${objPathStr}${FILEPATH_MARKER}`,
    );

    const { default: extractByDefault, file_ext: fileExt } = extractionSettings;

    if (!extractedFilePath && !extractByDefault) continue;

    // By this point, we have a field where we need to extract its content.
    const data = get(mutRemotePartial, objPathParts);
    const fileName = objPathParts.pop();

    // If we have an extracted file path from the local partial, we use that.
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
    set(mutRemotePartial, `${objPathStr}${FILEPATH_MARKER}`, relpath);
    unset(mutRemotePartial, objPathStr);
  }

  // At this point the bundle contains all extractable files, so we finally add
  // the partial JSON relative path + the file content.

  return set(
    bundle,
    [PARTIAL_JSON],
    prepareResourceJson(mutRemotePartial, $schema),
  );
};
