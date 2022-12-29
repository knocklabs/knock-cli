/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export const workflow = (attrs = {}) => {
  return {
    name: "New comment",
    key: "new-comment",
    active: false,
    valid: false,
    steps: [],
    ...attrs,
  };
};
