import { expect } from "@oclif/test";

import {
  formatPageActionPrompt,
  validatePageActionInput,
} from "@/lib/helpers/page";

describe("lib/helpers/page", () => {
  describe("formatPageActionPrompt", () => {
    describe("given a page info for the first page", () => {
      it("returns a prompt with a next page action", () => {
        const pageInfo = {
          after: "foo",
          before: null,
          page_size: 10,
        };
        const result = formatPageActionPrompt(pageInfo);
        expect(result).to.equal("[n: next page]");
      });
    });

    describe("given a page info for the last page", () => {
      it("returns a prompt with a previous page action", () => {
        const pageInfo = {
          after: null,
          before: "bar",
          page_size: 10,
        };
        const result = formatPageActionPrompt(pageInfo);
        expect(result).to.equal("[p: previous page]");
      });
    });

    describe("given a page info for a middle page", () => {
      it("returns a prompt with a previous page action", () => {
        const pageInfo = {
          after: "foo",
          before: "bar",
          page_size: 10,
        };
        const result = formatPageActionPrompt(pageInfo);
        expect(result).to.equal("[p: previous page, n: next page]");
      });
    });
  });

  describe("validatePageActionInput", () => {
    describe("given an input from the first page", () => {
      it("validates the input for a next page action", () => {
        const pageInfo = {
          after: "foo",
          before: null,
          page_size: 10,
        };
        const result1 = validatePageActionInput("hey", pageInfo);
        expect(result1).to.equal(undefined);

        const result2 = validatePageActionInput("p", pageInfo);
        expect(result2).to.equal(undefined);

        const result3 = validatePageActionInput("n", pageInfo);
        expect(result3).to.equal("n");
      });
    });

    describe("given an input from the middle page", () => {
      it("validates the input for next or previous page actions", () => {
        const pageInfo = {
          after: "foo",
          before: "bar",
          page_size: 10,
        };
        const result1 = validatePageActionInput("hey", pageInfo);
        expect(result1).to.equal(undefined);

        const result2 = validatePageActionInput("p", pageInfo);
        expect(result2).to.equal("p");

        const result3 = validatePageActionInput("n", pageInfo);
        expect(result3).to.equal("n");
      });
    });

    describe("given an input from the last page", () => {
      it("validates the input for a previous page action", () => {
        const pageInfo = {
          after: null,
          before: "bar",
          page_size: 10,
        };
        const result1 = validatePageActionInput("hey", pageInfo);
        expect(result1).to.equal(undefined);

        const result2 = validatePageActionInput("p", pageInfo);
        expect(result2).to.equal("p");

        const result3 = validatePageActionInput("n", pageInfo);
        expect(result3).to.equal(undefined);
      });
    });
  });
});
