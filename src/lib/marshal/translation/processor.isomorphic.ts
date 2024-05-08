import { TranslationData } from "./types";

type TranslationDirBundle = {
  [relpath: string]: string;
};

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
  format: string | undefined,
): string => {
  const ref =
    typeof input === "string"
      ? input
      : formatRef(input.locale_code, input.namespace);

  const extension = format === "po" ? "po" : "json";

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
): TranslationDirBundle => {
  if (Array.isArray(input)) {
    const translations = input;

    return Object.fromEntries(
      translations.map((translation) => [
        formatFileName(translation),
        JSON.parse(translation.content),
      ]),
    );
  }

  const translation = input;
  return {
    [formatFileName(translation)]: JSON.parse(translation.content),
  };
};
