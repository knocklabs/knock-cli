import { checkSlugifiedFormat } from "@/lib/helpers/string";
import { GuideDirContext } from "@/lib/run-context";
import * as Templates from "@/lib/templates";

import { MessageTypeData } from "../message-type";
import { WithAnnotation } from "../shared/types";
import { GUIDE_JSON, GuideDirBundle } from "./processor.isomorphic";
import { readGuideDir } from "./reader";
import { GuideData } from "./types";
import { writeGuideDirFromBundle, writeGuideDirFromData } from "./writer";

/*
 * Validates a string input for a guide key, and returns an error reason
 * if invalid.
 */
export const validateGuideKey = (input: string): string | undefined => {
  if (!checkSlugifiedFormat(input, { onlyLowerCase: true })) {
    return "must include only lowercase alphanumeric, dash, or underscore characters";
  }

  return undefined;
};

/*
 * Scaffolds placeholder values from a message type variant's field schema.
 * Creates appropriate empty/default values based on field type.
 */
type FieldValue = string | boolean | null | Record<string, string>;

export const scaffoldValuesFromSchema = (
  fields: MessageTypeData["variants"][0]["fields"],
): Record<string, FieldValue> => {
  const values: Record<string, FieldValue> = {};

  for (const field of fields) {
    switch (field.type) {
      case "text":
      case "textarea":
      case "markdown":
        values[field.key] = "";
        break;
      case "boolean":
        values[field.key] = false;
        break;
      case "select":
      case "multi_select":
        values[field.key] = null;
        break;
      case "button":
        values[field.key] = {
          text: "",
          action: "",
        };
        break;
    }
  }

  return values;
};

/*
 * Generates a new guide directory with a scaffolded guide.json file.
 * Assumes the given guide directory context is valid and correct.
 */
type NewGuideAttrs = {
  name: string;
  messageType: MessageTypeData;
  variantKey?: string;
};

const scaffoldGuideDirBundle = (attrs: NewGuideAttrs): GuideDirBundle => {
  const { name, messageType, variantKey = "default" } = attrs;

  // Find the selected variant or default to the first one
  const variant =
    messageType.variants.find((v) => v.key === variantKey) ||
    messageType.variants[0];

  if (!variant) {
    throw new Error(
      `Message type ${messageType.key} has no variants available`,
    );
  }

  // Scaffold values from the variant's field schema
  const values = scaffoldValuesFromSchema(variant.fields);

  const guideJson = {
    name,
    steps: [
      {
        ref: "step_1",
        schema_key: messageType.key,
        schema_variant_key: variant.key,
        values,
      },
    ],
  };

  return {
    [GUIDE_JSON]: guideJson,
  };
};

export const generateGuideDir = async (
  guideDirCtx: GuideDirContext,
  attrs: NewGuideAttrs,
): Promise<void> => {
  const bundle = scaffoldGuideDirBundle(attrs);

  return writeGuideDirFromBundle(guideDirCtx, bundle);
};

/*
 * Generates a guide from a template repository.
 */
export const generateGuideFromTemplate = async (
  guideDirCtx: GuideDirContext,
  templateString: string,
  attrs: { name: string },
): Promise<void> => {
  let tempDir: string | undefined;
  try {
    // Download the template directory into a temp directory
    tempDir = await Templates.downloadTemplate(templateString);

    // Create a guide directory context for the temp directory
    const tempGuideDirCtx: GuideDirContext = {
      type: "guide",
      key: "temp",
      abspath: tempDir,
      exists: true,
    };

    // Read the guide.json from the temp directory we downloaded
    const [guide, errors] = await readGuideDir(tempGuideDirCtx, {
      withExtractedFiles: true,
    });

    if (errors.length > 0 || !guide) {
      throw new Error(`Invalid guide template: ${errors.join(", ")}`);
    }

    // Modify the guide data with the new attributes
    guide.name = attrs.name;

    // Finally, we write the guide into the target guide directory
    writeGuideDirFromData(guideDirCtx, guide as GuideData<WithAnnotation>);

    return;
  } finally {
    await Templates.cleanupTempDir(tempDir);
  }
};

// Exported for tests.
export { scaffoldGuideDirBundle };
