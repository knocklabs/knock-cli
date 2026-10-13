import { AnyObj } from "@/lib/helpers/object.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import { prepareResourceJson } from "../shared/helpers.isomorphic";
import { ReusableRequestData } from "./types";

export const REUSABLE_REQUEST_JSON = "reusable_request.json";

export type ReusableRequestDirBundle = {
  [relpath: string]: string | Record<string, unknown>;
};

/*
 * For a given reusable request payload, this function builds a "reusable
 * request directory bundle". This is an object which contains all the
 * relative paths and its file content.
 *
 * Reusable requests have no extractable fields, so the payload is stored in
 * a single JSON file.
 */
export const buildReusableRequestDirBundle = (
  remoteReusableRequest: ReusableRequestData<WithAnnotation>,
  _localReusableRequest?: AnyObj,
  $schema?: string,
): ReusableRequestDirBundle => {
  return {
    [REUSABLE_REQUEST_JSON]: prepareResourceJson(
      remoteReusableRequest,
      $schema,
    ),
  };
};
