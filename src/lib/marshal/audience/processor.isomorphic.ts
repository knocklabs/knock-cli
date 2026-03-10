import { AnyObj } from "@/lib/helpers/object.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import { prepareResourceJson } from "../shared/helpers.isomorphic";
import { AudienceData } from "./types";

export const AUDIENCE_JSON = "audience.json";

export type AudienceDirBundle = {
  [relpath: string]: string | Record<string, unknown>;
};

/*
 * For a given audience payload, this function builds an "audience
 * directory bundle". This is an object which contains all the relative paths and
 * its file content.
 *
 * Note: Unlike other resources, audiences don't have extractable fields,
 * so this is a simpler implementation.
 */
export const buildAudienceDirBundle = (
  remoteAudience: AudienceData<WithAnnotation>,
  _localAudience?: AnyObj,
  $schema?: string,
): AudienceDirBundle => {
  return {
    [AUDIENCE_JSON]: prepareResourceJson(remoteAudience, $schema),
  };
};
