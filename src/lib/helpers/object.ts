import { isPlainObject, omit, pick } from "lodash";

export type AnyObj = Record<string, unknown>;

/*
 * Split an object into two based on keys provided (similar to Map.split/2 in
 * Elixir)
 */
export const split = (
  obj: AnyObj,
  paths: string | string[],
): [AnyObj, AnyObj] => {
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
export const omitDeep = (input: unknown, paths: string | string[]): any => {
  const omitDeepOnOwnProps = (item: any): any => {
    if (Array.isArray(item)) {
      return item.map((i) => omitDeepOnOwnProps(i));
    }

    if (isPlainObject(item)) {
      const obj: AnyObj = omit(item, paths);
      for (const [k, v] of Object.entries(obj)) {
        obj[k] = omitDeep(v, paths);
      }

      return obj;
    }

    return item;
  };

  return Array.isArray(input)
    ? input.map((i) => omitDeepOnOwnProps(i))
    : omitDeepOnOwnProps(input);
};
