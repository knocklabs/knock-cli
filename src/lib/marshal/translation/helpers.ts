import * as path from "node:path";

import { ux } from "@oclif/core";
import * as fs from "fs-extra";
import localeData from "locale-codes";

import { DirContext, isDirectory } from "@/lib/helpers/fs";
import { RunContext, TranslationDirContext } from "@/lib/run-context";

import {
  formatFileName,
  formatRef,
  SUPPORTED_TRANSLATION_FORMATS,
  TranslationFormat,
} from "./processor.isomorphic";
import { TranslationData } from "./types";

export const translationRefDescription = `
Translation ref is a identifier string that refers to a unique translation.
If a translation has no namespace, it is the same as the locale, e.g. \`en\`.
If namespaced, it is formatted as namespace.locale, e.g. \`admin.en\`.
`.trim();

export const SYSTEM_NAMESPACE = "system";

// Minimum data required to identify a single unique translation.
export type TranslationIdentifier = {
  localeCode: string;
  namespace: string | undefined;
};

export type TranslationFileContext = TranslationIdentifier & {
  ref: string;
  abspath: string;
  exists: boolean;
};

/*
 * Returns a human readable language for the given locale code.
 */
export const formatLanguage = (translation: TranslationData): string => {
  const lang = localeData.getByTag(translation.locale_code);

  return lang.location ? `${lang.name}, ${lang.location}` : lang.name;
};

/*
 * Evaluates whether the string is a valid locale name
 */
export const isValidLocale = (localeCode: string): boolean =>
  Boolean(localeData.getByTag(localeCode));

/*
 * Evaluates whether the given directory path is a translations directory
 * by checking if the directory name is a valid locale name
 */
export const isTranslationDir = (dirPath: string): boolean => {
  const locale = path.basename(dirPath);
  return isValidLocale(locale);
};

/*
 * Builds a translation file context that can be used
 * to determine the existence of the translation file,
 * its absolute path, and its identifiers.
 */
export const buildTranslationFileCtx = async (
  dirPath: string,
  translationIdentifier: TranslationIdentifier,
  options?: {
    format?: TranslationFormat;
  },
): Promise<TranslationFileContext> => {
  const ref = formatRef(
    translationIdentifier.localeCode,
    translationIdentifier.namespace,
  );
  const filename = formatFileName(ref, options);
  const abspath = path.resolve(dirPath, filename);
  const exists = await fs.pathExists(abspath);

  return {
    ref,
    localeCode: translationIdentifier.localeCode,
    namespace: translationIdentifier.namespace,
    abspath,
    exists,
  };
};

/*
 * Translation references will include the namespace first if one exists,
 * followed by a "." and then the locale code. If no namespace exists, it will
 * just be the locale code. Ex: `en` vs `admin.en`
 *
 * Note, does not validate the parsed locale code or the namespace.
 */
type ParsedTranslationRef = {
  localeCode: string;
  namespace: string | undefined;
};
export const parseTranslationRef = (
  reference: string,
): ParsedTranslationRef | undefined => {
  const strings = reference.split(".");

  // Locale code only (e.g. `en`)
  if (strings.length === 1) {
    return { localeCode: strings[0], namespace: undefined };
  }

  // Locale code prefixed with a namespace (e.g. `admin.en`)
  if (strings.length === 2) {
    return { localeCode: strings[1], namespace: strings[0] };
  }

  // Invalid pattern.
  return undefined;
};

/*
 * Validate the provided args and flags with the current run context, to first
 * ensure the invoked command makes sense, and return the target context.
 */
type CommandTargetProps = {
  flags: {
    all: boolean | undefined;
    "translations-dir": DirContext | undefined;
    format?: TranslationFormat;
  };
  args: {
    translationRef: string | undefined;
  };
};
type TranslationFileTarget = {
  type: "translationFile";
  context: TranslationFileContext;
};
type TranslationDirTarget = {
  type: "translationDir";
  context: TranslationDirContext;
};
type TranslationsIndexDirTarget = {
  type: "translationsIndexDir";
  context: DirContext;
};
export type TranslationCommandTarget =
  | TranslationFileTarget
  | TranslationDirTarget
  | TranslationsIndexDirTarget;

export const ensureValidCommandTarget = async (
  props: CommandTargetProps,
  runContext: RunContext,
): Promise<TranslationCommandTarget> => {
  const { flags, args } = props;
  const { commandId, resourceDir: resourceDirCtx, cwd: runCwd } = runContext;

  // Error, trying to run the command not in a translation directory.
  if (resourceDirCtx && resourceDirCtx.type !== "translation") {
    return ux.error(
      `Cannot run ${commandId} inside a ${resourceDirCtx.type} directory`,
    );
  }

  // Error, got neither the translationRef arg nor the --all flag.
  if (!args.translationRef && !flags.all) {
    ux.error("At least one of translation ref arg or --all flag must be given");
  }

  // No translationRef arg, which means --all flag is used.
  if (!args.translationRef) {
    // Targeting all translation files in the current locale directory.
    if (resourceDirCtx && !flags["translations-dir"]) {
      return { type: "translationDir", context: resourceDirCtx };
    }

    // Targeting all translation files in the translations index dir.
    // TODO: Default to the knock project config first if present before cwd.
    const defaultToCwd = { abspath: runCwd, exists: true };
    const indexDirCtx = flags["translations-dir"] || defaultToCwd;

    return { type: "translationsIndexDir", context: indexDirCtx };
  }

  // From this point on, we have translationRef so parse and validate the format.
  const parsedRef = parseTranslationRef(args.translationRef);
  if (!parsedRef) {
    return ux.error(
      `Invalid translation ref \`${args.translationRef}\`, use valid <locale> or <namespace>.<locale> for namespaced translations`,
    );
  }

  const { localeCode, namespace } = parsedRef;

  // If we are in the translation dir, make sure the locale matches.
  if (resourceDirCtx && resourceDirCtx.key !== localeCode) {
    return ux.error(
      `Cannot run ${commandId} with \`${args.translationRef}\` inside a ${resourceDirCtx.key} directory`,
    );
  }

  const targetDirPath = resourceDirCtx
    ? resourceDirCtx.abspath
    : flags["translations-dir"]
    ? path.resolve(flags["translations-dir"].abspath, localeCode)
    : path.resolve(runCwd, localeCode);

  // Got translationRef arg but no --all flag, which means target only a single
  // translation file.
  if (!flags.all) {
    // If specified, check the given format; otherwise check for all supported formats
    const formats = flags.format
      ? [flags.format]
      : SUPPORTED_TRANSLATION_FORMATS;

    const translationFileCtxs = await Promise.all(
      formats.map(async (format) =>
        buildTranslationFileCtx(
          targetDirPath,
          { localeCode, namespace },
          { format },
        ),
      ),
    );
    if (flags.format) {
      return { type: "translationFile", context: translationFileCtxs[0] };
    }

    // If no format is specified, look for the first existing file and return that context
    const existingFileCtx = translationFileCtxs.find((ctx) => ctx.exists);
    if (existingFileCtx) {
      return { type: "translationFile", context: existingFileCtx };
    }

    // If no file exists, fall back to the file context with the default format (json)
    return { type: "translationFile", context: translationFileCtxs[0] };
  }

  // From this point on, we have both translationRef and --all flag used
  // together, so make sure we are targeting a non-namespaced top-level locale.
  if (namespace) {
    return ux.error(
      `Cannot use --all with a namespaced translation \`${args.translationRef}\``,
    );
  }

  const translationDirCtx: TranslationDirContext = {
    type: "translation",
    key: localeCode,
    abspath: targetDirPath,
    exists: await isDirectory(targetDirPath),
  };
  return { type: "translationDir", context: translationDirCtx };
};

/*
 * List out abspaths of all translation files in a given directory.
 *
 * It filters out any directories or files that do not conform to the
 * translation file name format (e.g. `en.json` or `namespace.en.json` for the
 * `en` locale directory).
 *
 * Note, it assumes the given path exists and is a valid locale directory.
 */
export const lsTranslationDir = async (
  pathToDir: string,
): Promise<string[]> => {
  const localeCode = path.basename(pathToDir).toLowerCase();
  const dirents = await fs.readdir(pathToDir, { withFileTypes: true });

  return dirents
    .filter((dirent) => {
      if (dirent.isDirectory()) return false;

      const filename = dirent.name.toLowerCase();
      const isValidExtension = SUPPORTED_TRANSLATION_FORMATS.some((extension) =>
        filename.endsWith(`${localeCode}.${extension}`),
      );
      if (!isValidExtension) return false;

      const { name: translationRef } = path.parse(filename);
      const parsedRef = parseTranslationRef(translationRef);
      if (!parsedRef) return false;

      return true;
    })
    .map((dirent) => path.resolve(pathToDir, dirent.name));
};
