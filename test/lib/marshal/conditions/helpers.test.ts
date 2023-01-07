import { expect } from "@oclif/test";

import { formatConditions } from "@/lib/marshal/conditions/helpers";

describe("lib/marshal/conditions/helpers", () => {
  describe("formatConditions", () => {
    describe("given a single depth conditions of ANY", () => {
      it("returns a formatted human readable string", () => {
        const conditions = {
          any: [
            { variable: "a", operator: "equal_to", argument: "1" },
            { variable: "b", operator: "equal_to", argument: "2" },
            { variable: "c", operator: "equal_to", argument: "3" },
          ],
        };
        const expected = `
"a" equal_to "1"; OR
"b" equal_to "2"; OR
"c" equal_to "3"
`.trimStart();

        expect(formatConditions(conditions)).to.equal(expected);
      });
    });

    describe("given a single depth conditions of ALL", () => {
      it("returns a formatted human readable string", () => {
        const conditions = {
          all: [
            { variable: "a", operator: "equal_to", argument: "1" },
            { variable: "b", operator: "equal_to", argument: "2" },
            { variable: "c", operator: "equal_to", argument: "3" },
          ],
        };
        const expected = `
"a" equal_to "1"; AND
"b" equal_to "2"; AND
"c" equal_to "3"
`.trimStart();

        expect(formatConditions(conditions)).to.equal(expected);
      });
    });

    describe("given nested conditions of ALL joined by ANY", () => {
      it("returns a formatted human readable string", () => {
        const conditions = {
          any: [
            {
              all: [
                { variable: "a", operator: "equal_to", argument: "1" },
                { variable: "b", operator: "equal_to", argument: "2" },
              ],
            },
            {
              all: [{ variable: "c", operator: "equal_to", argument: "3" }],
            },
          ],
        };
        const expected = `
"a" equal_to "1"; AND
"b" equal_to "2"
 OR
"c" equal_to "3"
`.trimStart();

        expect(formatConditions(conditions)).to.equal(expected);
      });
    });

    describe("given nested conditions of ANY joined by ALL", () => {
      it("returns a formatted human readable string", () => {
        const conditions = {
          all: [
            {
              any: [
                { variable: "a", operator: "equal_to", argument: "1" },
                { variable: "b", operator: "equal_to", argument: "2" },
              ],
            },
            {
              any: [{ variable: "c", operator: "equal_to", argument: "3" }],
            },
          ],
        };
        const expected = `
"a" equal_to "1"; OR
"b" equal_to "2"
 AND
"c" equal_to "3"
`.trimStart();

        expect(formatConditions(conditions)).to.equal(expected);
      });
    });

    describe("given an ampty conditions", () => {
      it("throws an invalid conditions error", () => {
        const conditions = {
          all: undefined,
          any: undefined,
        };

        expect(() => formatConditions(conditions)).to.throw();
      });
    });
  });
});
