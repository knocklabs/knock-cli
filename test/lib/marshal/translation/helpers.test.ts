import { expect } from "@oclif/test";

import { xpath } from "@/../test/support";
import { isTranslationDir } from "@/lib/marshal/translation";

describe("lib/marshal/translation/helpers", () => {
  describe("isTranslationDir", () => {
    describe("given a path with a valid locale code", () => {
      it("returns true", () => {
        const path = xpath("/translations/fr-FR");
        expect(isTranslationDir(path)).to.be.true;
      });
    });
    describe("given a path with an invalid locale code", () => {
      it("returns false", () => {
        const path = xpath("/translations/fake-lang");
        expect(isTranslationDir(path)).to.be.false;
      });
    });
  });
});
