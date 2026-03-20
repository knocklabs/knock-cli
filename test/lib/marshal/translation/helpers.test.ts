import { expect } from "@oclif/test";

import { xpath } from "@/../test/support";
import { isTranslationDir } from "@/lib/marshal/translation";

describe("lib/marshal/translation/helpers", () => {
  describe("isTranslationDir", () => {
    describe("given a path with a valid locale code under a translations parent", () => {
      it("returns true", () => {
        const path = xpath("/translations/fr-FR");
        expect(isTranslationDir(path)).to.be.true;
      });
    });

    describe("given a path with a valid locale code under a non-translations parent", () => {
      it("returns false", () => {
        const path = xpath("/Users/mr/my-project");
        expect(isTranslationDir(path)).to.be.false;
      });
    });

    describe("given a locale-code directory name as a username in the path", () => {
      it("returns false", () => {
        const path = xpath("/home/mr");
        expect(isTranslationDir(path)).to.be.false;
      });
    });

    describe("given an invalid locale code under a translations parent", () => {
      it("returns false", () => {
        const path = xpath("/translations/fake-lang");
        expect(isTranslationDir(path)).to.be.false;
      });
    });
  });
});
