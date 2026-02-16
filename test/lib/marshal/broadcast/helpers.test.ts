import { expect } from "@oclif/test";

import { factory } from "@/../test/support";
import {
  formatCategories,
  formatStatus,
  validateBroadcastKey,
} from "@/lib/marshal/broadcast/helpers";

describe("lib/marshal/broadcast/helpers", () => {
  describe("formatCategories", () => {
    describe("given a broadcast with no categories", () => {
      it("returns an empty display string, default or configured", () => {
        const broadcast = factory.broadcast({ categories: undefined });

        expect(formatCategories(broadcast)).to.equal("");
        expect(formatCategories(broadcast, { emptyDisplay: "-" })).to.equal(
          "-",
        );
      });
    });

    describe("given a broadcast with categories without truncating", () => {
      it("returns a string of categories joined by commas", () => {
        const broadcast = factory.broadcast({ categories: ["a", "b", "c"] });

        expect(formatCategories(broadcast)).to.equal("a, b, c");
      });
    });

    describe("given a broadcast with categories above a truncate threshold", () => {
      it("returns a string of categories joined by commas, plus the remaining count", () => {
        const broadcast = factory.broadcast({
          categories: ["a", "b", "c", "d"],
        });

        const result = formatCategories(broadcast, { truncateAfter: 2 });
        expect(result).to.equal("a, b (+ 2 more)");
      });
    });
  });

  describe("formatStatus", () => {
    it("returns the broadcast status", () => {
      expect(formatStatus(factory.broadcast({ status: "draft" }))).to.equal(
        "draft",
      );
      expect(formatStatus(factory.broadcast({ status: "scheduled" }))).to.equal(
        "scheduled",
      );
      expect(formatStatus(factory.broadcast({ status: "sent" }))).to.equal(
        "sent",
      );
    });
  });

  describe("validateBroadcastKey", () => {
    it("returns undefined for valid keys", () => {
      expect(validateBroadcastKey("valid-key")).to.be.undefined;
      expect(validateBroadcastKey("valid_key")).to.be.undefined;
      expect(validateBroadcastKey("valid123")).to.be.undefined;
    });

    it("returns error message for invalid keys", () => {
      expect(validateBroadcastKey("Invalid-Key")).to.not.be.undefined;
      expect(validateBroadcastKey("invalid key")).to.not.be.undefined;
    });
  });
});
