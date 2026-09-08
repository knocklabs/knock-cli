import * as path from "node:path";

import { expect } from "@oclif/test";

import { isPathArg, resolvePathArg } from "@/lib/helpers/path";

describe("lib/helpers/path", () => {
  describe("isPathArg", () => {
    it("returns true for paths containing forward slash", () => {
      expect(isPathArg("workflows/new-comment")).to.equal(true);
      expect(isPathArg("./new-comment")).to.equal(true);
      expect(isPathArg("/absolute/path")).to.equal(true);
    });

    it("returns true for paths containing backslash", () => {
      expect(isPathArg("workflows\\new-comment")).to.equal(true);
    });

    it("returns true for paths starting with dot", () => {
      expect(isPathArg("./new-comment")).to.equal(true);
      expect(isPathArg("..")).to.equal(true);
    });

    it("returns false for resource keys", () => {
      expect(isPathArg("new-comment")).to.equal(false);
      expect(isPathArg("foo")).to.equal(false);
      expect(isPathArg("admin.en")).to.equal(false);
    });
  });

  describe("resolvePathArg", () => {
    it("resolves path and extracts key from basename", () => {
      const result = resolvePathArg("./workflows/new-comment");
      expect(result.key).to.equal("new-comment");
      expect(result.abspath).to.equal(
        path.resolve(process.cwd(), "workflows", "new-comment"),
      );
    });

    it("extracts key from nested path", () => {
      const result = resolvePathArg("a/b/c/my-resource");
      expect(result.key).to.equal("my-resource");
      expect(result.abspath).to.equal(
        path.resolve(process.cwd(), "a", "b", "c", "my-resource"),
      );
    });
  });
});
