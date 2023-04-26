import * as path from "node:path";

import * as fs from "fs-extra";
import localeData from "locale-codes";
import { CliUx } from "@oclif/core";

import { isDirectory, DirContext } from "@/lib/helpers/fs";
import { RunContext, TranslationDirContext } from "@/lib/run-context";

import { Props } from "@/lib/base-command"

/*
 * Evaluates whether the string is a valid locale name
 */
export const isValidLocale = (localeCode: string): boolean =>
  Boolean(localeData.getByTag(localeCode));

/*
 * Evaluates whether the given directory path is a translations directory
 * by checking if the directory name is a valid locale name
 */
export const isTranslationsDir = (dirPath: string): boolean => {
  const locale = path.basename(dirPath);
  return isValidLocale(locale);
};

export type TranslationFileContext = {
  localeCode: string;
  namespace: string | undefined;
  abspath: string;
  exists: boolean;
};

/*
 * Builds a translation file context that can be used
 * to determine the existence of the translation file,
 * its absolute path, and its identifiers.
 */
export const buildTranslationFileCtx = async (
  dirPath: string,
  localeCode: string,
  namespace: string | undefined,
): Promise<TranslationFileContext> => {
  const filename = namespace
    ? `${namespace}.${localeCode}.json`
    : `${localeCode}.json`;

  const abspath = path.resolve(dirPath, filename);
  const exists = await fs.pathExists(abspath);

  return {
    localeCode,
    namespace,
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
  namespace?: string;
}
export const parseTranslationRef = (reference: string): ParsedTranslationRef | undefined => {
  const strings = reference.split(".");

  // Locale code only (e.g. `en`)
  if (strings.length === 1) {
    return { localeCode: strings[0] }
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
export type TranslationCommandTarget = {
  // Only of the keys should be present at a time.
  translationFile?: TranslationFileContext;
  translationDir?: TranslationDirContext;
  translationsIndexDir?: DirContext;
}
export const ensureValidCommandTarget = async (
  props: Props,
  runContext: RunContext,
): Promise<TranslationCommandTarget> => {
  const { flags, args } = props;
  const { commandId, resourceDir, cwd: runCwd } = runContext;

  // Error, trying to run the command not in a translation directory.
  if (resourceDir && resourceDir.type !== "translation") {
    return CliUx.ux.error(
      `Cannot run ${commandId} inside a ${resourceDir.type} directory`,
    );
  }

  // Error, got neither the translationRef arg nor the --all flag.
  if (!args.translationRef && !flags.all) {
    CliUx.ux.error(
      "At least one of translationRef arg or --all flag must be used"
    );
  }

  // No translationRef arg, which means --all flag is used.
  if (!args.translationRef) {

    // Targeting all translation files in the current locale directory.
    if (resourceDir) {
      return { translationDir: resourceDir };
    }

    // Targeting all translation files in the translations index dir.
    // TODO: Default to the knock project config first if present before cwd.
    const defaultToCwd = { abspath: runContext.cwd, exists: true };
    const indexDirCtx = flags["translations-dir"] || defaultToCwd;

    return { translationsIndexDir: indexDirCtx };
  }

  // From this point on, we have translationRef so parse and validate the format.
  const parsedRef = parseTranslationRef(args.translationRef)
  if (!parsedRef) {
    return CliUx.ux.error(
      `Invalid translationRef arg \`${args.translationRef}\`, use valid <locale> or <namespace>.<locale> for namespaced translations`,
    );
  }

  const { localeCode, namespace } = parsedRef;

  // If we are in the translation dir, make sure the locale matches.
  if (resourceDir && resourceDir.key !== localeCode) {
    return CliUx.ux.error(
      `Cannot run ${commandId} with \`${args.translationRef}\` inside a ${resourceDir.key} directory`,
    );
  }

  const targetDirPath = resourceDir
    ? resourceDir.abspath
    : path.resolve(runCwd, localeCode);

  // Got translationRef arg but no --all flag, which means target only a single
  // translation file.
  if (!flags.all) {
    const translationFileCtx = await buildTranslationFileCtx(
      targetDirPath,
      localeCode,
      namespace
    )
    return { translationFile: translationFileCtx }
  }

  // From this point on, we have both translationRef and --all flag used
  // together, so make sure we are targeting a non-namespaced top-level locale.
  if (namespace) {
    return CliUx.ux.error(
      `Namespaced translation \`${args.translationRef}\` cannot be used with --all`,
    );
  }

  const translationDirCtx: TranslationDirContext = {
    type: "translation",
    key: localeCode,
    abspath: targetDirPath,
    exists: await isDirectory(targetDirPath),
  }
  return { translationDir: translationDirCtx };
}

/*
 * XXX
 */
export const lsTranslationDir = async (pathToDir: string) => {
  const localeCode = path.basename(pathToDir).toLowerCase();
  const dirents = await fs.readdir(pathToDir, { withFileTypes: true })

  return dirents
    .filter(dirent => {
      if (dirent.isDirectory()) return false;

      const filename = dirent.name.toLowerCase();
      if (!filename.endsWith(`${localeCode}.json`)) return false;

      const { name: translationRef } = path.parse(filename);
      const parsedRef = parseTranslationRef(translationRef);
      if (!parsedRef) return false;

      return true;
    })
    .map(dirent => path.resolve(pathToDir, dirent.name))
}
