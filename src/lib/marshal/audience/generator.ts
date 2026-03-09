import { AudienceDirContext } from "@/lib/run-context";

import { AUDIENCE_JSON, AudienceDirBundle } from "./processor.isomorphic";
import { AudienceType } from "./types";
import { writeAudienceDirFromBundle } from "./writer";

/*
 * Attributes for creating a new audience from scratch.
 */
type NewAudienceAttrs = {
  name: string;
  type: AudienceType;
  description?: string;
};

/*
 * Scaffolds a new audience directory bundle with default content.
 */
const scaffoldAudienceDirBundle = (
  attrs: NewAudienceAttrs,
): AudienceDirBundle => {
  const audienceJson: Record<string, unknown> = {
    name: attrs.name,
    type: attrs.type,
  };

  if (attrs.description) {
    audienceJson.description = attrs.description;
  }

  return {
    [AUDIENCE_JSON]: audienceJson,
  };
};

/*
 * Generates a new audience directory with a scaffolded audience.json file.
 * Assumes the given audience directory context is valid and correct.
 */
export const generateAudienceDir = async (
  audienceDirCtx: AudienceDirContext,
  attrs: NewAudienceAttrs,
): Promise<void> => {
  const bundle = scaffoldAudienceDirBundle(attrs);

  return writeAudienceDirFromBundle(audienceDirCtx, bundle);
};

// Exported for tests.
export { scaffoldAudienceDirBundle };
