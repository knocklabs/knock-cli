import { expect } from "@oclif/test";

import { formatCommandScope } from "@/lib/helpers/command";

describe("lib/helpers/command", () => {
  describe("formatCommandScope", () => {
    it("returns the correct string for an environment", () => {
      const result = formatCommandScope({ environment: "test-environment" });
      expect(result).to.equal("`test-environment` environment");
    });

    it("returns the correct string for a branch", () => {
      const result = formatCommandScope({
        environment: "test-environment",
        branch: "my-feature-branch-123",
      });
      expect(result).to.equal("`my-feature-branch-123` branch");
    });
  });
});
