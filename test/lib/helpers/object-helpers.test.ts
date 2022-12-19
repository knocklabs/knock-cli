import { expect } from "@oclif/test";

import { split, omitDeep } from "@/lib/helpers/object-helpers";

describe("split", () => {
  describe("takes a key to extract from a given object", () => {
    it("returns a tuple with a new extracted object plus the old object with a removed key", () => {
      const obj = {
        a: 1,
        b: 2,
        c: 3,
      };
      const result = split(obj, "a");
      expect(result).to.eql([{ a: 1 }, { b: 2, c: 3 }]);
    });
  });

  describe("takes a list of keys to extract from a given object", () => {
    it("returns a tuple with a new extracted object plus the old object with removed keys", () => {
      const obj = {
        a: 1,
        b: 2,
        c: 3,
      };
      const result = split(obj, ["a", "b", "x"]);
      expect(result).to.eql([{ a: 1, b: 2 }, { c: 3 }]);
    });
  });
});

describe("omitDeep", () => {
  describe("takes an object with target key(s)", () => {
    it("returns an object with target key(s) removed recursively", () => {
      const obj = {
        a: 1,
        b: 2,
        c: {
          d: 3,
          e: 4,
          f: {
            e: 4,
            g: 5,
          },
        },
      };
      const result1 = omitDeep(obj, "e");
      expect(result1).to.eql({ a: 1, b: 2, c: { d: 3, f: { g: 5 } } });

      const result2 = omitDeep(obj, ["a", "d", "f", "h"]);
      expect(result2).to.eql({ b: 2, c: { e: 4 } });
    });
  });

  describe("takes an array with target key(s)", () => {
    it("returns an array with target key(s) removed recursively in its items", () => {
      const array = [
        { a: 1, b: 2, c: 3 },
        { a: 1, b: 2, c: { d: 4, e: 5 } },
      ];

      const result1 = omitDeep(array, "c");
      expect(result1).to.eql([
        { a: 1, b: 2 },
        { a: 1, b: 2 },
      ]);

      const result2 = omitDeep(array, ["b", "e", "g"]);
      expect(result2).to.eql([
        { a: 1, c: 3 },
        { a: 1, c: { d: 4 } },
      ]);
    });
  });
});
