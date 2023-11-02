// Mark any template fields we are extracting out with this suffix as a rule,
// so we can reliably interpret the field value.
export const FILEPATH_MARKER = "@";
export const FILEPATH_MARKED_RE = new RegExp(`${FILEPATH_MARKER}$`);
