import { expect } from "@oclif/test";

import { checkSlugifiedFormat, slugify } from "@/lib/helpers/string";

describe("lib/helpers/string", () => {
  describe("checkSlugifiedFormat", () => {
    describe("given an option of onlyLowerCase true (default)", () => {
      it("returns true if the input string matches /^[a-z0-9_-]+$/", () => {
        expect(checkSlugifiedFormat("one-two_three-4")).to.equal(true);
      });

      it("returns false if the input string includes a whitespace", () => {
        expect(checkSlugifiedFormat("one-two_ three-4")).to.equal(false);
      });

      it("returns false if the input string includes a special character", () => {
        expect(checkSlugifiedFormat("one-two!three-4")).to.equal(false);
      });
    });

    describe("given an option of onlyLowerCase false", () => {
      it("returns true if the input string matches /^[a-zA-Z0-9_-]+$/", () => {
        expect(
          checkSlugifiedFormat("one-two_three-4", { onlyLowerCase: false }),
        ).to.equal(true);

        // Allows uppercase characters
        expect(
          checkSlugifiedFormat("one-two_Three-4", { onlyLowerCase: false }),
        ).to.equal(true);
      });

      it("returns false if the input string includes a whitespace", () => {
        expect(
          checkSlugifiedFormat("one-two_ three-4", { onlyLowerCase: false }),
        ).to.equal(false);
      });

      it("returns false if the input string includes a special character", () => {
        expect(
          checkSlugifiedFormat("one-two!three-4", { onlyLowerCase: false }),
        ).to.equal(false);
      });
    });
  });

  describe("slugify", () => {
    it("converts a string to a slugified format", () => {
      expect(slugify("One Two Three")).to.equal("one-two-three");
    });

    it("collapses whitespace when slugifying", () => {
      expect(slugify("  One  Two  Three  ")).to.equal("one-two-three");
    });
  });
});
