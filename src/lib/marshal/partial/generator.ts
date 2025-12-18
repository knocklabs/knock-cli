import { cloneDeep } from "lodash";

import { checkSlugifiedFormat } from "@/lib/helpers/string";
import { PartialDirContext } from "@/lib/run-context";
import * as Templates from "@/lib/templates";

import { FILEPATH_MARKER } from "../shared/const.isomorphic";
import { WithAnnotation } from "../shared/types";
import { PARTIAL_JSON, PartialDirBundle } from "./processor.isomorphic";
import { readPartialDir } from "./reader";
import { PartialData, PartialType } from "./types";
import { writePartialDirFromBundle, writePartialDirFromData } from "./writer";

/*
 * Validates a string input for a partial key, and returns an error reason
 * if invalid.
 */
export const validatePartialKey = (input: string): string | undefined => {
  if (!checkSlugifiedFormat(input, { onlyLowerCase: true })) {
    return "must include only lowercase alphanumeric, dash, or underscore characters";
  }

  return undefined;
};

/*
 * Maps the partial type to the correct file extension.
 */
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
 * Returns the default scaffolded content for a partial based on its type.
 */
const defaultContentForType = (type: PartialType): string => {
  switch (type) {
    case PartialType.Html:
      return "<div>{{ content }}</div>";
    case PartialType.Json:
      return "{}";
    case PartialType.Markdown:
      return "**{{ content }}**";
    case PartialType.Text:
    default:
      return "{{ content }}";
  }
};

/*
 * Attributes for creating a new partial from scratch.
 */
type NewPartialAttrs = {
  name: string;
  type: PartialType;
};

/*
 * Scaffolds a new partial directory bundle with default content.
 */
const scaffoldPartialDirBundle = (attrs: NewPartialAttrs): PartialDirBundle => {
  const fileExt = partialTypeToFileExt(attrs.type);
  const contentFilePath = `content.${fileExt}`;
  const defaultContent = defaultContentForType(attrs.type);

  const partialJson = {
    name: attrs.name,
    type: attrs.type,
    [`content${FILEPATH_MARKER}`]: contentFilePath,
  };

  return {
    [PARTIAL_JSON]: partialJson,
    [contentFilePath]: defaultContent,
  };
};

/*
 * Generates a new partial directory with a scaffolded partial.json file.
 * Assumes the given partial directory context is valid and correct.
 */
export const generatePartialDir = async (
  partialDirCtx: PartialDirContext,
  attrs: NewPartialAttrs,
): Promise<void> => {
  const bundle = scaffoldPartialDirBundle(attrs);

  return writePartialDirFromBundle(partialDirCtx, bundle);
};

/*
 * Generates a new partial directory from a template.
 */
export const generatePartialFromTemplate = async (
  partialDirCtx: PartialDirContext,
  templateString: string,
  attrs: { name: string },
): Promise<void> => {
  let tempDir: string | undefined;

  try {
    // Download the template directory into a temp directory
    tempDir = await Templates.downloadTemplate(templateString);

    // Create a partial directory context for the temp directory
    const tempPartialDirCtx: PartialDirContext = {
      type: "partial",
      key: "temp",
      abspath: tempDir,
      exists: true,
    };

    // Read the partial.json from the temp directory we downloaded
    const [partial, errors] = await readPartialDir(tempPartialDirCtx, {
      withExtractedFiles: true,
    });

    if (errors.length > 0 || !partial) {
      throw new Error(`Invalid partial template: ${errors.join(", ")}`);
    }

    // Modify the partial data with the new attributes
    const partialData = cloneDeep(partial) as PartialData<WithAnnotation>;
    partialData.name = attrs.name;

    // Finally, we write the partial into the target partial directory
    await writePartialDirFromData(partialDirCtx, partialData);
  } finally {
    await Templates.cleanupTempDir(tempDir);
  }
};

// Exported for tests.
export { scaffoldPartialDirBundle };
