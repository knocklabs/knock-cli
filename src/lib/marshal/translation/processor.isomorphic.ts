import { TranslationData } from "./types";

type TranslationDirBundle = {
  [relpath: string]: string;
};

export type TranslationFormat = "json" | "po";
// Note: json should be the first option so that in cases where the array is used
// and order matters, json (the default format) is first.
export const SUPPORTED_TRANSLATION_FORMATS: Readonly<TranslationFormat[]> = [
  "json",
  "po",
] as const;
export const DEFAULT_TRANSLATION_FORMAT = "json";

/*
 * Returns a formatted translation "ref".
 */
export const formatRef = (
  localeCode: string,
  namespace: string | undefined,
): string => (namespace ? `${namespace}.${localeCode}` : localeCode);

/*
 * Returns a formatted translation file name based on the given translation ref
 * or payload.
 */
export const formatFileName = (
  input: string | TranslationData,
  options?: {
    format?: TranslationFormat;
  },
): string => {
  const extension = options?.format ?? DEFAULT_TRANSLATION_FORMAT;
  const ref =
    typeof input === "string"
      ? input
      : formatRef(input.locale_code, input.namespace);

  return `${ref}.${extension}`;
};

/*
 * Takes one or more translation payloads, and builds a "translation locale
 * directory bundle". This is an object which contains all the relative paths of
 * the translation file(s) and its file content.
 *
 * Note: all given translation(s) in a single directory bundle should be of the
 * same locale, and this is assumed for the input without further validations.
 */
type OneOrMoreTranslationData = TranslationData | TranslationData[];

export const buildTranslationDirBundle = (
  input: OneOrMoreTranslationData,
  options?: {
    format?: TranslationFormat;
  },
): TranslationDirBundle => {
  const format = options?.format ?? DEFAULT_TRANSLATION_FORMAT;
  if (Array.isArray(input)) {
    const translations = input;

    return Object.fromEntries(
      translations.map((translation) => [
        formatFileName(translation, { format }),
        JSON.parse(translation.content),
      ]),
    );
  }

  const translation = input;
  const content =
    format === "json" ? JSON.parse(translation.content) : translation.content;
  return {
    [formatFileName(translation, { format })]: content,
  };
};
