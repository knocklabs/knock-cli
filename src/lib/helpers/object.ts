import {
  isNil,
  isPlainObject,
  merge as _merge,
  omit,
  omitBy,
  pick,
} from "lodash";

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

/*
 * Omit any keys that have nil or undefined.
 */
export const prune = (obj: AnyObj): AnyObj => omitBy(obj, isNil);

/*
 * Lodash merge, but without mutating the underlying object.
 */
export const merge = (obj: AnyObj, ...sources: AnyObj[]): any =>
  _merge({}, obj, ...sources);

/*
 * A helper class for keeping track of an object path as we traverse an object
 * tree, mainly so we can provide a helpful error message by pointing to exactly
 * where something looks wrong.
 *
 * Maintains a state called `parts` that is an array of key strings or index
 * numbers, which can be outputted to a properly formatted path string.
 *
 * For example: `foo.bar[0].baz`
 */
type ObjKeyOrArrayIdx = string | number;

export class ObjPath {
  private parts: ObjKeyOrArrayIdx[];

  constructor(parts: ObjKeyOrArrayIdx[] = []) {
    this.parts = [...parts];
  }

  // Pushes a new path part to its inner state, moving down into an obj tree.
  push(part: ObjKeyOrArrayIdx): ObjPath {
    this.parts = [...this.parts, part];
    return this;
  }

  // Pops the last path part from its inner state, moving up in an obj tree.
  pop(): ObjPath {
    this.parts = this.parts.slice(0, -1);
    return this;
  }

  // Resets its inner parts state to the given path parts.
  reset(parts: ObjKeyOrArrayIdx[]): ObjPath {
    this.parts = [...parts];
    return this;
  }

  // Returns the current state in a NEW array, mainly used to bookmark a certain
  // point in the path so we can reset to.
  checkout(): ObjKeyOrArrayIdx[] {
    return [...this.parts];
  }

  // Takes one or multiple path parts, then returns a single purpose object with
  // a `str` lambda method that's hardcoded to format a path string based on the
  // latest parts state plus given parts. Useful when formatting a path string
  // looking ahead without pushing/popping.
  to(forward: ObjKeyOrArrayIdx | ObjKeyOrArrayIdx[]): { str: string } {
    const temp = Array.isArray(forward) ? forward : [forward];
    const parts = [...this.parts, ...temp];

    return {
      get str(): string {
        return ObjPath.stringify(parts);
      },
    };
  }

  // Getter method that calls stringify on its current path parts state, to
  // return the formatted object path.
  get str(): string {
    return ObjPath.stringify(this.parts);
  }

  // Takes an array of path parts, then returns a json path notation string,
  // useful in displaying a helpful reference to users in error messages as well
  // as reading/updating objects (e.g. via the lodash get or set method).
  static stringify(parts: ObjKeyOrArrayIdx[]): string {
    return parts
      .map((part, idx) => {
        if (typeof part === "string") return idx === 0 ? part : `.${part}`;
        if (typeof part === "number") return `[${part}]`;

        throw new Error(`Unhandled path part type: ${part}`);
      })
      .join("");
  }
}
