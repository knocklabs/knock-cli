import { expect } from "@oclif/test";

import {
  getLastFound,
  mapValuesDeep,
  merge,
  ObjPath,
  omitDeep,
  prune,
} from "@/lib/helpers/object.isomorphic";

describe("lib/helpers/object", () => {
  describe("omitDeep", () => {
    describe("given an object with target key(s) to remove", () => {
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

    describe("given an array with target key(s) to remove", () => {
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

    describe("given an input arg that is not an object or array", () => {
      it("returns the input back", () => {
        expect(omitDeep(null, "foo")).to.equal(null);
        expect(omitDeep(undefined, "foo")).to.equal(undefined);
        expect(omitDeep(1, "foo")).to.equal(1);
        expect(omitDeep("hey", "foo")).to.equal("hey");
      });
    });
  });

  describe("mapValuesDeep", () => {
    describe("given an object", () => {
      it("traverses and calls the interatee function on every leaf value", () => {
        const obj = {
          a: {
            b: 1,
            c: "foo",
            d: ["bar", { e: 2 }, "baz", { f: "hi" }],
            g: null,
          },
        };

        const result = mapValuesDeep(obj, (val, _, parts) => {
          if (typeof val === "string") return ObjPath.stringify(parts);
          if (typeof val === "number") return val + 1;
          return val;
        });

        expect(result).to.eql({
          a: {
            b: 2,
            c: "a.c",
            d: ["bar", { e: 3 }, "baz", { f: "a.d[3].f" }],
            g: null,
          },
        });
      });
    });
  });

  describe("getLastFound", () => {
    describe("given an object with no matching path", () => {
      it("returns undefined", () => {
        const obj = {
          a: {
            b: 1,
            c: "foo",
            d: ["bar", { e: 2 }, "baz"],
          },
        };

        expect(getLastFound(obj, ["x", "y", "z"])).to.equal(undefined);
      });
    });

    describe("given an object with a partially matching path ", () => {
      it("returns the last found value for the path", () => {
        const obj = {
          a: {
            b: 1,
            c: "foo",
            d: ["bar", { e: 2 }, "baz"],
          },
        };

        expect(getLastFound(obj, ["a", "c", "x"])).to.equal("foo");
        expect(getLastFound(obj, ["a", "d", "x"])).to.eql([
          "bar",
          { e: 2 },
          "baz",
        ]);
        expect(getLastFound(obj, ["a", "d", 1, "x"])).to.eql({ e: 2 });
      });
    });

    describe("given an object with a fully matching path", () => {
      it("returns the exact value found at the path", () => {
        const obj = {
          a: {
            b: 1,
            c: "foo",
            d: ["bar", { e: 2 }, "baz"],
          },
        };

        expect(getLastFound(obj, ["a", "d", 2])).to.equal("baz");
      });
    });
  });

  describe("prune", () => {
    describe("given an object", () => {
      it("returns an object without any keys that have null or undefined", () => {
        const obj = {
          a: 0,
          b: null,
          c: undefined,
          d: "",
        };

        expect(prune(obj)).to.eql({
          a: 0,
          d: "",
        });
      });
    });
  });

  describe("merge", () => {
    describe("given one or more objects", () => {
      it("returns a single object with all input objects merged", () => {
        const obj1 = {
          a: 0,
          b: 1,
        };

        const obj2 = {
          b: ["b-1", "b-2"],
          c: {
            d: 2,
          },
        };

        const obj3 = {
          b: ["b-3"],
          c: {
            e: 3,
          },
        };

        expect(merge(obj1, obj2, obj3)).to.eql({
          a: 0,
          b: ["b-3", "b-2"],
          c: {
            d: 2,
            e: 3,
          },
        });
      });
    });
  });

  describe("ObjPath", () => {
    it("can format given path parts into an obj path str", () => {
      const objPath = new ObjPath(["one", "two", 3, 4, "five"]);

      expect(objPath.str).to.equal("one.two[3][4].five");
    });

    it("can track additional path parts, then format an obj path str", () => {
      const objPath = new ObjPath(["one", "two", 3, 4, "five"]);

      objPath.pop();
      objPath.pop();
      objPath.pop();
      objPath.push("three");

      // ESLint gets confused for some reason and thinks we are calling
      // Array#push() here, so tries to auto format into one mangled line below.
      // eslint-disable-next-line unicorn/no-array-push-push
      objPath.push(4);
      // eslint-disable-next-line unicorn/no-array-push-push
      objPath.push(5);

      expect(objPath.str).to.equal("one.two.three[4][5]");
    });

    it("can take one forward path part, then format an obj path str", () => {
      const objPath = new ObjPath(["one", "two", 3, 4, "five"]);

      expect(objPath.to("hey").str).to.equal("one.two[3][4].five.hey");

      // Should not mutate the inner state.
      expect(objPath.checkout()).to.eql(["one", "two", 3, 4, "five"]);
    });

    it("can take multiple forward path parts, then format an obj path str", () => {
      const objPath = new ObjPath(["one", "two", 3, 4, "five"]);

      expect(objPath.to(["hey", 7]).str).to.equal("one.two[3][4].five.hey[7]");

      // Should not mutate the inner state.
      expect(objPath.checkout()).to.eql(["one", "two", 3, 4, "five"]);
    });

    it("can track path parts, then reset to a given state", () => {
      const objPath = new ObjPath([1, "two", 3, 4, "five"]);

      objPath.pop();
      objPath.pop();

      const bookmarked = objPath.checkout();
      expect(bookmarked).to.eql([1, "two", 3]);

      objPath.push("foo");
      expect(objPath.str).to.eql("[1].two[3].foo");

      objPath.reset(bookmarked);
      expect(objPath.str).to.eql("[1].two[3]");
    });
  });
});
