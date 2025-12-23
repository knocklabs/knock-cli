import { cloneDeep } from "lodash";

import { checkSlugifiedFormat } from "@/lib/helpers/string";
import { MessageTypeDirContext } from "@/lib/run-context";
import * as Templates from "@/lib/templates";

import { FILEPATH_MARKER } from "../shared/const.isomorphic";
import { WithAnnotation } from "../shared/types";
import {
  MESSAGE_TYPE_JSON,
  MessageTypeDirBundle,
} from "./processor.isomorphic";
import { readMessageTypeDir } from "./reader";
import { MessageTypeData } from "./types";
import {
  writeMessageTypeDirFromBundle,
  writeMessageTypeDirFromData,
} from "./writer";

/*
 * Validates a string input for a message type key, and returns an error reason
 * if invalid.
 */
export const validateMessageTypeKey = (input: string): string | undefined => {
  if (!checkSlugifiedFormat(input, { onlyLowerCase: true })) {
    return "must include only lowercase alphanumeric, dash, or underscore characters";
  }

  return undefined;
};

/*
 * Returns the default scaffolded preview content.
 */
const defaultPreviewContent = (): string => {
  return `{{ name }}`;
};

/*
 * Attributes for creating a new message type from scratch.
 */
type NewMessageTypeAttrs = {
  name: string;
};

/*
 * Scaffolds a new message type directory bundle with default content.
 */
const scaffoldMessageTypeDirBundle = (
  attrs: NewMessageTypeAttrs,
): MessageTypeDirBundle => {
  const previewFilePath = "preview.txt";
  const defaultPreview = defaultPreviewContent();

  const messageTypeJson = {
    name: attrs.name,
    description: "",
    variants: [
      {
        key: "default",
        name: "Default",
        fields: [],
      },
    ],
    [`preview${FILEPATH_MARKER}`]: previewFilePath,
  };

  return {
    [MESSAGE_TYPE_JSON]: messageTypeJson,
    [previewFilePath]: defaultPreview,
  };
};

/*
 * Generates a new message type directory with a scaffolded message_type.json file.
 * Assumes the given message type directory context is valid and correct.
 */
export const generateMessageTypeDir = async (
  messageTypeDirCtx: MessageTypeDirContext,
  attrs: NewMessageTypeAttrs,
): Promise<void> => {
  const bundle = scaffoldMessageTypeDirBundle(attrs);

  return writeMessageTypeDirFromBundle(messageTypeDirCtx, bundle);
};

/*
 * Generates a new message type directory from a template.
 */
export const generateMessageTypeFromTemplate = async (
  messageTypeDirCtx: MessageTypeDirContext,
  templateString: string,
  attrs: { name: string },
): Promise<void> => {
  let tempDir: string | undefined;

  try {
    // Download the template directory into a temp directory
    tempDir = await Templates.downloadTemplate(templateString);

    // Create a message type directory context for the temp directory
    const tempMessageTypeDirCtx: MessageTypeDirContext = {
      type: "message_type",
      key: "temp",
      abspath: tempDir,
      exists: true,
    };

    // Read the message_type.json from the temp directory we downloaded
    const [messageType, errors] = await readMessageTypeDir(
      tempMessageTypeDirCtx,
      {
        withExtractedFiles: true,
      },
    );

    if (errors.length > 0 || !messageType) {
      throw new Error(`Invalid message type template: ${errors.join(", ")}`);
    }

    // Modify the message type data with the new attributes
    const messageTypeData = cloneDeep(
      messageType,
    ) as MessageTypeData<WithAnnotation>;
    messageTypeData.name = attrs.name;

    // Finally, we write the message type into the target message type directory
    await writeMessageTypeDirFromData(messageTypeDirCtx, messageTypeData);
  } finally {
    await Templates.cleanupTempDir(tempDir);
  }
};

// Exported for tests.
export { scaffoldMessageTypeDirBundle };
