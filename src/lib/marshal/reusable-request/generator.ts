import { ReusableRequestDirContext } from "@/lib/run-context";

import {
  REUSABLE_REQUEST_JSON,
  ReusableRequestDirBundle,
} from "./processor.isomorphic";
import { ReusableRequestHttpMethod, ReusableRequestType } from "./types";
import { writeReusableRequestDirFromBundle } from "./writer";

type NewReusableRequestAttrs = {
  name: string;
  type: ReusableRequestType;
  description?: string;
  method: ReusableRequestHttpMethod;
  url: string;
};

const scaffoldReusableRequestDirBundle = (
  attrs: NewReusableRequestAttrs,
): ReusableRequestDirBundle => {
  const reusableRequestJson: Record<string, unknown> = {
    name: attrs.name,
    type: attrs.type,
    settings: {
      method: attrs.method,
      url: attrs.url,
    },
  };

  if (attrs.description) {
    reusableRequestJson.description = attrs.description;
  }

  return {
    [REUSABLE_REQUEST_JSON]: reusableRequestJson,
  };
};

/*
 * Generates a new reusable request directory with a scaffolded
 * reusable_request.json file.
 */
export const generateReusableRequestDir = async (
  reusableRequestDirCtx: ReusableRequestDirContext,
  attrs: NewReusableRequestAttrs,
): Promise<void> => {
  const bundle = scaffoldReusableRequestDirBundle(attrs);

  return writeReusableRequestDirFromBundle(reusableRequestDirCtx, bundle);
};

export { scaffoldReusableRequestDirBundle };
