/*
 * IMPORTANT:
 *
 * This file is suffixed with `.isomorphic` because the code in this file is
 * meant to run not just in a nodejs environment but also in a browser. For this
 * reason there are some restrictions for which nodejs imports are allowed in
 * this module. See `.eslintrc.json` for more details.
 */
import { AnyObj } from "@/lib/helpers/object.isomorphic";
import { buildStepResourceDirBundle } from "@/lib/marshal/shared/steps.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import type { BroadcastData } from "./types";

export const BROADCAST_JSON = "broadcast.json";

export type BroadcastDirBundle = {
  [relpath: string]: string | AnyObj;
};

/*
 * For a given broadcast payload (and its local broadcast reference), this
 * function builds a "broadcast directory bundle", which is an obj made up of all
 * the relative file paths (within the broadcast directory) and its file content
 * to write the broadcast directory.
 *
 * Broadcasts share workflow step extraction. Extracted files are strings; the
 * root broadcast.json object is added after that walk.
 */
export const buildBroadcastDirBundle = (
  remoteBroadcast: BroadcastData<WithAnnotation>,
  localBroadcast?: AnyObj,
  $schema?: string,
): BroadcastDirBundle =>
  buildStepResourceDirBundle(
    remoteBroadcast,
    localBroadcast,
    BROADCAST_JSON,
    $schema,
  );
