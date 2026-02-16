/*
 * IMPORTANT:
 *
 * This file is suffixed with `.isomorphic` because the code in this file is
 * meant to run not just in a nodejs environment but also in a browser. For this
 * reason there are some restrictions for which nodejs imports are allowed in
 * this module. See `.eslintrc.json` for more details.
 */
import { cloneDeep, set } from "lodash";

import { AnyObj } from "@/lib/helpers/object.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import { prepareResourceJson } from "../shared/helpers.isomorphic";
import {
  keyLocalStepsByRef,
  recursivelyBuildStepsDirBundle,
  WorkflowDirBundle,
} from "../workflow/processor.isomorphic";
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
 * Broadcasts share the same step/template structure as workflows, so we reuse
 * the workflow's content extraction logic for steps.
 */
export const buildBroadcastDirBundle = (
  remoteBroadcast: BroadcastData<WithAnnotation>,
  localBroadcast?: AnyObj,
  $schema?: string,
): BroadcastDirBundle => {
  const bundle: WorkflowDirBundle = {};
  localBroadcast = localBroadcast || {};
  const mutBroadcast = cloneDeep(remoteBroadcast);
  const localStepsByRef = keyLocalStepsByRef(localBroadcast.steps);

  recursivelyBuildStepsDirBundle(
    bundle,
    mutBroadcast.steps as any,
    localStepsByRef,
  );

  return set(
    bundle,
    [BROADCAST_JSON],
    prepareResourceJson(mutBroadcast, $schema),
  );
};
