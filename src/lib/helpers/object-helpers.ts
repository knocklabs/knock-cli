import { omit, pick, isPlainObject } from "lodash";

// Generic untyped object.
export type Obj = { [k: string]: any };

/*
 * Split an object into two based on keys provided (similar to Map.split/2 in
 * Elixir)
 */
export const split = (obj: Obj, paths: string | string[]): [Obj, Obj] => {
  const picked = pick(obj, paths);
  const remainder = omit(obj, paths);

  return [picked, remainder];
};

/*
 * Omit a given key or keys recursively from an object or an array.
 *
 * Implementation is loosely based on omit-deep-lodash, and typed:
 * https://github.com/odynvolk/omit-deep-lodash/blob/master/src/index.js
 */
export const omitDeep = (input: any, paths: string | string[]): any => {
  function omitDeepOnOwnProps(item: any): any {
    if (Array.isArray(item)) {
      return item.map(omitDeepOnOwnProps);
    }

    if (isPlainObject(item)) {
      const obj: Obj = omit(item, paths);
      for (const [k, v] of Object.entries(obj)) {
        obj[k] = omitDeep(v, paths);
      }
      return obj;
    }

    return item;
  }

  return Array.isArray(input)
    ? input.map(omitDeepOnOwnProps)
    : omitDeepOnOwnProps(input);
};
