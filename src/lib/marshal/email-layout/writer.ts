import path from "node:path";

import * as fs from "fs-extra";
import { cloneDeep, get, has, set, uniqueId, unset } from "lodash";

import { sandboxDir } from "@/lib/helpers/const";
import { DirContext } from "@/lib/helpers/fs";
import { DOUBLE_SPACES } from "@/lib/helpers/json";
import { ObjKeyOrArrayIdx, ObjPath, omitDeep } from "@/lib/helpers/object";
import { AnyObj, split } from "@/lib/helpers/object";
import { FILEPATH_MARKER } from "@/lib/marshal/shared/helpers";
import { ExtractionSettings, WithAnnotation } from "@/lib/marshal/shared/types";
import { EmailLayoutDirContext } from "@/lib/run-context";

import { isEmailLayoutDir, LAYOUT_JSON } from "./helpers";
import { readEmailLayoutDir } from "./reader";
import { EmailLayoutData } from "./types";

export type EmailLayoutDirBundle = {
  [relpath: string]: string;
};

type CompiledExtractionSettings = Map<ObjKeyOrArrayIdx[], ExtractionSettings>;

/* Traverse a given email layout data and compile extraction settings of every extractable
 * field into a sorted map.
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
 * and writing, by stripping out any annotation fields and handling readonly
 * fields.
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
 * Then writes them into a layout directory on a local file system.
 */
export const writeEmailLayoutDirFromData = async (
  emailLayoutDirCtx: EmailLayoutDirContext,
  remoteEmailLayout: EmailLayoutData<WithAnnotation>,
): Promise<void> => {
  // If the layout directory exists on the file system (i.e. previously
  // pulled before), then read the layout file to use as a reference.
  const [localEmailLayout] = emailLayoutDirCtx.exists
    ? await readEmailLayoutDir(emailLayoutDirCtx, { withExtractedFiles: true })
    : [];

  const bundle = buildEmailLayoutDirBundle(remoteEmailLayout, localEmailLayout);

  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));
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
 * This is an object which contains all the relative paths and its file content.
 * It includes the extractable fields, which are extracted out and added to the bundle as separate files.
 */
const buildEmailLayoutDirBundle = (
  remoteEmailLayout: EmailLayoutData<WithAnnotation>,
  localEmailLayout: AnyObj = {},
): EmailLayoutDirBundle => {
  const bundle: EmailLayoutDirBundle = {};
  const mutRemoteEmailLayout = cloneDeep(remoteEmailLayout);

  // A map of extraction settings of every field in the email layout
  const compiledExtractionSettings =
    compileExtractionSettings(mutRemoteEmailLayout);

  // Iterate through each extractable field, determine whether we need to
  // extract the field content, and if so, perform the
  // extraction.
  for (const [objPath, extractionSettings] of compiledExtractionSettings) {
    // If this layout doesn't have this field path, then we don't extract.
    if (!has(mutRemoteEmailLayout, objPath)) continue;

    // If the field at this path is extracted in the local layout, then
    // always extract; otherwise extract based on the field settings default.
    const objPathStr = ObjPath.stringify(objPath);

    const extractedFilePath = get(
      localEmailLayout,
      `${objPathStr}${FILEPATH_MARKER}`,
    );
    const { default: extractByDefault, file_ext: fileExt } = extractionSettings;

    if (!extractedFilePath && !extractByDefault) continue;

    // By this point, we have a field where we need to extract its content.
    const data = get(mutRemoteEmailLayout, objPath);
    const fileName = objPath.pop();

    // If we have an extracted file path from the local layout, we use that. In the other
    // case we use the default path.
    const relpath =
      typeof extractedFilePath === "string"
        ? extractedFilePath
        : `${fileName}.${fileExt}`;

    // Perform the extraction by adding the content and its file path to the
    // bundle for writing to the file system later. Then replace the field
    // content with the extracted file path and mark the field as extracted
    // with @ suffix.
    set(bundle, [relpath], data);
    set(mutRemoteEmailLayout, `${objPathStr}${FILEPATH_MARKER}`, relpath);
    unset(mutRemoteEmailLayout, objPathStr);
  }

  // At this point the bundle contains all extractable files, so we finally add the layout
  // JSON realtive path + the file content.

  return set(bundle, [LAYOUT_JSON], toEmailLayoutJson(mutRemoteEmailLayout));
};

// This bulk write function takes the fetched email layouts data KNOCK API and writes
// them into a layouts "index" directory.
export const writeEmailLayoutIndexDir = async (
  indexDirCtx: DirContext,
  remoteEmailLayouts: EmailLayoutData<WithAnnotation>[],
): Promise<void> => {
  const backupDirPath = path.resolve(sandboxDir, uniqueId("backup"));

  try {
    if (indexDirCtx.exists) {
      await fs.copy(indexDirCtx.abspath, backupDirPath);
      await pruneLayoutsIndexDir(indexDirCtx, remoteEmailLayouts);
    }

    const writeEmailLayoutDirPromises = remoteEmailLayouts.map(
      async (remoteEmailLayout) => {
        const emailLayoutDirPath = path.resolve(
          indexDirCtx.abspath,
          remoteEmailLayout.key,
        );

        const emailLayoutDirCtx: EmailLayoutDirContext = {
          type: "email_layout",
          key: remoteEmailLayout.key,
          abspath: emailLayoutDirPath,
          exists: indexDirCtx.exists
            ? await isEmailLayoutDir(emailLayoutDirPath)
            : false,
        };

        return writeEmailLayoutDirFromData(
          emailLayoutDirCtx,
          remoteEmailLayout,
        );
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

/*
 * Prunes the index directory by removing any files, or directories that aren't
 * layout dirs found in fetched layouts. We want to preserve any layout
 * dirs that are going to be updated with remote layouts, so extracted links
 * can be respected.
 */
const pruneLayoutsIndexDir = async (
  indexDirCtx: DirContext,
  remoteEmailLayouts: EmailLayoutData<WithAnnotation>[],
): Promise<void> => {
  const emailLayoutsByKey = Object.fromEntries(
    remoteEmailLayouts.map((e) => [e.key.toLowerCase(), e]),
  );

  const dirents = await fs.readdir(indexDirCtx.abspath, {
    withFileTypes: true,
  });
  const promises = dirents.map(async (dirent) => {
    const direntName = dirent.name.toLowerCase();
    const direntPath = path.resolve(indexDirCtx.abspath, direntName);

    if ((await isEmailLayoutDir(direntPath)) && emailLayoutsByKey[direntName]) {
      return;
    }

    await fs.remove(direntPath);
  });

  await Promise.all(promises);
};

// Exported for tests
export { buildEmailLayoutDirBundle, pruneLayoutsIndexDir, toEmailLayoutJson };
