import path from "node:path";

import * as fs from "fs-extra";
import { get, set, uniqueId } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { ObjKeyOrArrayIdx, omitDeep } from "@/lib/helpers/object";
import { AnyObj, split } from "@/lib/helpers/object";
import { EmailLayoutDirContext } from "@/lib/run-context";

import { ExtractionSettings, WithAnnotation } from "../shared/types";
import { LAYOUT_JSON } from "./helpers";
import { EmailLayoutData } from "./types";

export type EmailLayoutDirBundle = {
  [relpath: string]: string;
};

type CompiledExtractionSettings = Map<ObjKeyOrArrayIdx[], ExtractionSettings>;

/* Traverse a given email layout data and compile extraction settings of every extractable
   field into a sorted map.
*/
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

/* Sanitize the email layout content into a format that's appropriate for reading
   and writing, by stripping out any annotation fields and handling readonly
   fields.
*/
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

/* Builds an email layout dir bundle, which consist of the email layout JSON + the extractable files.
   Then writes them into a layout directory on a local file system.
*/
export const writeEmailLayoutDirFromData = async (
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

      return relpath === LAYOUT_JSON
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

/* For a given email layout payload, this function builds a "email layout directoy bundle".
   This is an object which contains all the relative paths and its file content.
   It includes the extractable fields, which are extracted out and added to the bundle as separate files.
*/
const buildEmailLayoutDirBundle = (
  emailLayout: EmailLayoutData<WithAnnotation>,
): EmailLayoutDirBundle => {
  const bundle: EmailLayoutDirBundle = {};

  // A map of extraction settings of every field in the email layout
  const compiledExtractionSettings = compileExtractionSettings(emailLayout);

  // Iterate through each extractable field, determine whether we need to
  // extract the field content, and if so, perform the
  // extraction.
  for (const [objPath, extractionSettings] of compiledExtractionSettings) {
    const { default: extractByDefault, file_ext: fileExt } = extractionSettings;

    if (!extractByDefault) continue;

    // Extract the field and its content
    const data = get(emailLayout, objPath);
    const fileName = objPath.pop();
    const relpath = `${fileName}.${fileExt}`;

    set(bundle, [relpath], data);
  }

  // At this point the bundle contains all extractable files, so we finally add the layout
  // JSON realtive path + the file content.

  return set(bundle, [LAYOUT_JSON], toEmailLayoutJson(emailLayout));
};

// This bulk write function takes the fetched email layouts data KNOCK API and writes
// them into a directory.
export const writeEmailLayoutIndexDir = async (
  indexDirCtx: DirContext,
  emailLayouts: EmailLayoutData<WithAnnotation>[],
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await fs.emptyDir(indexDirCtx.abspath);
    }

    const writeEmailLayoutDirPromises = emailLayouts.map(
      async (emailLayout) => {
        const emailLayoutDirPath = path.resolve(
          indexDirCtx.abspath,
          emailLayout.key,
        );

        const emailLayoutDirCtx: EmailLayoutDirContext = {
          type: "email_layout",
          key: emailLayout.key,
          abspath: emailLayoutDirPath,
          exists: false,
        };

        return writeEmailLayoutDirFromData(emailLayoutDirCtx, emailLayout);
      },
    );

    await Promise.all(writeEmailLayoutDirPromises);
  } catch (error) {
    if (indexDirCtx.exists) {
      await fs.emptyDir(indexDirCtx.abspath);
      await fs.copy(backupDirPath, indexDirCtx.abspath);
    } else {
      await fs.remove(indexDirCtx.abspath);
    }

    throw error;
  } finally {
    // Always clean up the backup directory in the temp sandbox.
    await fs.remove(backupDirPath);
  }
};
