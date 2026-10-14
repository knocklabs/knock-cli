const REUSABLE_REQUEST_KEY_RE = /^[\d_a-z-]+$/;
const REUSABLE_REQUEST_KEY_MIN = 3;
const REUSABLE_REQUEST_KEY_MAX = 255;

/*
 * Validates a reusable request key. Keys must be 3 to 255 characters and
 * match ^[a-z0-9_-]+$.
 */
export const validateReusableRequestKey = (
  input: string,
): string | undefined => {
  if (
    input.length < REUSABLE_REQUEST_KEY_MIN ||
    input.length > REUSABLE_REQUEST_KEY_MAX ||
    !REUSABLE_REQUEST_KEY_RE.test(input)
  ) {
    return "must be 3 to 255 characters and include only lowercase alphanumeric, dash, or underscore characters";
  }

  return undefined;
};
