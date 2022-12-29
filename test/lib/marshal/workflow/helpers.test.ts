import { expect } from "@oclif/test";

import { formatCategories } from "@/lib/marshal/workflow/helpers";

describe("lib/marshal/workflow/helpers", () => {
  describe("formatCategories", () => {
    describe("given a workflow with no categories", () => {
      it("returns an empty display string, default or configured", () => {
        const workflow = {
          name: "Foo",
        } as any;

        expect(formatCategories(workflow)).to.equal("");
        expect(formatCategories(workflow, { emptyDisplay: "-" })).to.equal("-");
      });
    });

    describe("given a workflow with categories without truncating", () => {
      it("returns a string of categories joined by commas", () => {
        const workflow = {
          name: "Foo",
          categories: ["a", "b", "c"],
        } as any;

        expect(formatCategories(workflow)).to.equal("a, b, c");
      });
    });

    describe("given a workflow with categories within a truncate threshold", () => {
      it("returns a string of categories joined by commas", () => {
        const workflow = {
          name: "Foo",
          categories: ["a", "b", "c"],
        } as any;

        const result = formatCategories(workflow, { truncateAfter: 3 });
        expect(result).to.equal("a, b, c");
      });
    });

    describe("given a workflow with categories above a truncate threshold", () => {
      it("returns a string of categories joined by commas, plus the remaining count", () => {
        const workflow = {
          name: "Foo",
          categories: ["a", "b", "c", "d"],
        } as any;

        const result = formatCategories(workflow, { truncateAfter: 2 });
        expect(result).to.equal("a, b (+ 2 more)");
      });
    });
  });

  // TODO: Write tests for formatStepSummary if/once the output is agreed.
});
