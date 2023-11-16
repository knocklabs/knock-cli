/*
 * IMPORTANT:
 *
 * This file is suffixed with `.isomorphic` because the code in this file is
 * meant to run not just in a nodejs environment but also in a browser. For this
 * reason there are some restrictions for which nodejs imports are allowed in
 * this module. See `.eslintrc.json` for more details.
 */

// Mark any template fields we are extracting out with this suffix as a rule,
// so we can reliably interpret the field value.
export const FILEPATH_MARKER = "@";
export const FILEPATH_MARKED_RE = new RegExp(`${FILEPATH_MARKER}$`);
