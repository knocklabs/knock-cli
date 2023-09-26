import path from "node:path";

import * as fs from "fs-extra";
import { get, set, uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import {
  mapValuesDeep,
  ObjKeyOrArrayIdx,
  omitDeep,
} from "@/lib/helpers/object";
import { AnyObj, split } from "@/lib/helpers/object";
import { EmailLayoutDirContext } from "@/lib/run-context";

import { ExtractionSettings, WithAnnotation } from "../shared/types";
import { FILEPATH_MARKED_RE } from "../workflow";
import { EmailLayoutData } from "./types";

export type EmailLayoutDirBundle = {
  [relpath: string]: string;
};
/*
 * Sanitize the email latyout content into a format that's appropriate for reading
 * and writing, by stripping out any annotation fields and handling readonly
 * fields.
 */
type CompiledExtractionSettings = Map<ObjKeyOrArrayIdx[], ExtractionSettings>;

const compileExtractionSettings = (
  emailLayout: EmailLayoutData<WithAnnotation>,
): CompiledExtractionSettings => {
  const extractableFields = get(
    emailLayout,
    ["__annotation", "extractable_fields"],
    {},
  );
  const map: CompiledExtractionSettings = new Map();

  for (const [key] of Object.entries(emailLayout)) {
    // If the field we are on is extractable, then add its extraction
    // settings to the map with the current object path.
    if (key in extractableFields) {
      map.set([key], extractableFields[key]);
    }
  }

  return map;
};

const toEmailLayoutJson = (
  emailLayout: EmailLayoutData<WithAnnotation>,
): AnyObj => {
  // Move read only field under the dedicated field "__readonly".
  const readonlyFields = emailLayout.__annotation?.readonly_fields || [];
  const [readonly, remainder] = split(emailLayout, readonlyFields);
  const emailLayoutjson = { ...remainder, __readonly: readonly };

  // Strip out all schema annotations, so not to expose them to end users.
  return omitDeep(emailLayoutjson, ["__annotation"]);
};

// Builds an email layout dir bundle and writes it into a layout directory on local file system.
export const writeWorkflowDirFromData = async (
  emailLayoutDirCtx: EmailLayoutDirContext,
  emailLayout: EmailLayoutData<WithAnnotation>,
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  const bundle = buildEmailLayoutDirBundle(emailLayout);
  try {
    // We store a backup in case there's an error.
    if (emailLayoutDirCtx.exists) {
      await fs.copy(emailLayoutDirCtx.abspath, backupDirPath);
      await fs.emptyDir(emailLayoutDirCtx.abspath);
    }

    const promises = Object.entries(bundle).map(([relpath, fileContent]) => {
      const filePath = path.resolve(emailLayoutDirCtx.abspath, relpath);

      return relpath === `${emailLayout.key}.json`
        ? fs.outputJson(filePath, fileContent, { spaces: DOUBLE_SPACES })
        : fs.outputFile(filePath, fileContent);
    });
    await Promise.all(promises);
  } catch (error) {
    // In case of any error, wipe the target directory that is likely in a bad
    // state then restore the backup if one existed before.
    if (emailLayoutDirCtx.exists) {
      await fs.emptyDir(emailLayoutDirCtx.abspath);
      await fs.copy(backupDirPath, emailLayoutDirCtx.abspath);
    } else {
      await fs.remove(emailLayoutDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};

// For a given email layout payload, this function builds an "layout directoy bundle".
// This is an object which contains an `email_layout_key.json` file and all extractable fields.
// Those extractable fields are extracted out and added to the bundle as separate files.
const buildEmailLayoutDirBundle = (
  emailLayout: EmailLayoutData<WithAnnotation>,
): EmailLayoutDirBundle => {
  const bundle: EmailLayoutDirBundle = {};

  // A compiled map of extraction settings of every field in the email layout
  const compiledExtractionSettings = compileExtractionSettings(emailLayout);

  // Iterate through each extractable field, determine whether we need to
  // extract the field content, and if so, perform the
  // extraction.
  for (const [objPathParts, extractionSettings] of compiledExtractionSettings) {
    const { default: extractByDefault, file_ext: fileExt } = extractionSettings;
    if (!extractByDefault) continue;
    // Extract the field and its content
    let data = get(emailLayout, objPathParts);
    const relpath = formatExtractedFilePath(objPathParts, fileExt);

    data = mapValuesDeep(data, (value, key) => {
      if (!FILEPATH_MARKED_RE.test(key)) return value;

      const rebaseRootDir = path.dirname(relpath);
      const rebasedFilePath = path.relative(rebaseRootDir, value);

      return rebasedFilePath;
    });

    set(bundle, [relpath], data);
  }

  // At this point the bundles contains all extractable fields, so we finally add the email layout JSON file.
  return set(
    bundle,
    [`${emailLayout.key}.json`],
    toEmailLayoutJson(emailLayout),
  );
};

const formatExtractedFilePath = (
  objPathParts: ObjKeyOrArrayIdx[],
  fileExt: string,
): string => {
  const fileName = objPathParts.pop();
  const paths = [`${fileName}.${fileExt}`];

  return path.join(...paths).toLowerCase();
};
