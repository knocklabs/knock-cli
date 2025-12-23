import { cloneDeep } from "lodash";

import { checkSlugifiedFormat } from "@/lib/helpers/string";
import { EmailLayoutDirContext } from "@/lib/run-context";
import * as Templates from "@/lib/templates";

import { FILEPATH_MARKER } from "../shared/const.isomorphic";
import { WithAnnotation } from "../shared/types";
import { EmailLayoutDirBundle, LAYOUT_JSON } from "./processor.isomorphic";
import { readEmailLayoutDir } from "./reader";
import { EmailLayoutData } from "./types";
import {
  writeEmailLayoutDirFromBundle,
  writeEmailLayoutDirFromData,
} from "./writer";

/*
 * Validates a string input for an email layout key, and returns an error reason
 * if invalid.
 */
export const validateEmailLayoutKey = (input: string): string | undefined => {
  if (!checkSlugifiedFormat(input, { onlyLowerCase: true })) {
    return "must include only lowercase alphanumeric, dash, or underscore characters";
  }

  return undefined;
};

/*
 * Returns the default scaffolded HTML layout content.
 */
const defaultHtmlLayoutContent = (): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    {{ content }}
  </div>
</body>
</html>`;
};

/*
 * Returns the default scaffolded text layout content.
 */
const defaultTextLayoutContent = (): string => {
  return `{{ content }}`;
};

/*
 * Attributes for creating a new email layout from scratch.
 */
type NewEmailLayoutAttrs = {
  name: string;
};

/*
 * Scaffolds a new email layout directory bundle with default content.
 */
const scaffoldEmailLayoutDirBundle = (
  attrs: NewEmailLayoutAttrs,
): EmailLayoutDirBundle => {
  const htmlLayoutFilePath = "html_layout.html";
  const textLayoutFilePath = "text_layout.txt";
  const defaultHtmlContent = defaultHtmlLayoutContent();
  const defaultTextContent = defaultTextLayoutContent();

  const layoutJson = {
    name: attrs.name,
    [`html_layout${FILEPATH_MARKER}`]: htmlLayoutFilePath,
    [`text_layout${FILEPATH_MARKER}`]: textLayoutFilePath,
  };

  return {
    [LAYOUT_JSON]: layoutJson,
    [htmlLayoutFilePath]: defaultHtmlContent,
    [textLayoutFilePath]: defaultTextContent,
  };
};

/*
 * Generates a new email layout directory with a scaffolded layout.json file.
 * Assumes the given email layout directory context is valid and correct.
 */
export const generateEmailLayoutDir = async (
  emailLayoutDirCtx: EmailLayoutDirContext,
  attrs: NewEmailLayoutAttrs,
): Promise<void> => {
  const bundle = scaffoldEmailLayoutDirBundle(attrs);

  return writeEmailLayoutDirFromBundle(emailLayoutDirCtx, bundle);
};

/*
 * Generates a new email layout directory from a template.
 */
export const generateEmailLayoutFromTemplate = async (
  emailLayoutDirCtx: EmailLayoutDirContext,
  templateString: string,
  attrs: { name: string },
): Promise<void> => {
  let tempDir: string | undefined;

  try {
    // Download the template directory into a temp directory
    tempDir = await Templates.downloadTemplate(templateString);

    // Create an email layout directory context for the temp directory
    const tempEmailLayoutDirCtx: EmailLayoutDirContext = {
      type: "email_layout",
      key: "temp",
      abspath: tempDir,
      exists: true,
    };

    // Read the layout.json from the temp directory we downloaded
    const [emailLayout, errors] = await readEmailLayoutDir(
      tempEmailLayoutDirCtx,
      {
        withExtractedFiles: true,
      },
    );

    if (errors.length > 0 || !emailLayout) {
      throw new Error(`Invalid email layout template: ${errors.join(", ")}`);
    }

    // Modify the email layout data with the new attributes
    const emailLayoutData = cloneDeep(
      emailLayout,
    ) as EmailLayoutData<WithAnnotation>;
    emailLayoutData.name = attrs.name;

    // Finally, we write the email layout into the target email layout directory
    await writeEmailLayoutDirFromData(emailLayoutDirCtx, emailLayoutData);
  } finally {
    await Templates.cleanupTempDir(tempDir);
  }
};

// Exported for tests.
export { scaffoldEmailLayoutDirBundle };
