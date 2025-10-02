/*
 * Checks if a given string is in a slugified format.
 */
const SLUG_FORMAT_RE = /^[\w-]+$/;
const SLUG_LOWERCASE_FORMAT_RE = /^[\d_a-z-]+$/;

type CheckSlugifiedFormatOpts = {
  onlyLowerCase?: boolean;
};

export const checkSlugifiedFormat = (
  input: string,
  opts: CheckSlugifiedFormatOpts = {},
): boolean => {
  const { onlyLowerCase = true } = opts;

  return onlyLowerCase
    ? SLUG_LOWERCASE_FORMAT_RE.test(input)
    : SLUG_FORMAT_RE.test(input);
};

/*
 * Indent each line in a string, useful when printing out nested errors.
 *
 * NOTE: Copied over from https://github.com/sindresorhus/indent-string for now,
 * because getting an "[ERR_REQUIRE_ESM]: Must use import to load ES Module"
 * error when pulling in the package.
 */
type IndentStringOpts = {
  indent?: string;
  includeEmptyLines?: boolean;
};

export const indentString = (
  string: string,
  count = 0,
  options: IndentStringOpts = {},
): string => {
  const { indent = " ", includeEmptyLines = false } = options;

  if (typeof string !== "string") {
    throw new TypeError(
      `Expected \`input\` to be a \`string\`, got \`${typeof string}\``,
    );
  }

  if (typeof count !== "number") {
    throw new TypeError(
      `Expected \`count\` to be a \`number\`, got \`${typeof count}\``,
    );
  }

  if (count < 0) {
    throw new RangeError(
      `Expected \`count\` to be at least 0, got \`${count}\``,
    );
  }

  if (typeof indent !== "string") {
    throw new TypeError(
      `Expected \`options.indent\` to be a \`string\`, got \`${typeof indent}\``,
    );
  }

  if (count === 0) {
    return string;
  }

  const regex = includeEmptyLines ? /^/gm : /^(?!\s*$)/gm;

  return string.replace(regex, indent.repeat(count));
};

/*
 * Converts a string to a slugified format.
 *
 * For example, "One Two Three" becomes "one-two-three".
 */
export const slugify = (input: string): string =>
  input.toLowerCase().trim().replace(/\s+/g, "-");
