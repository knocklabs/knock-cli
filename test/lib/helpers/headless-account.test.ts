import crypto from "node:crypto";

import { expect } from "@oclif/test";

import {
  formatWait,
  hasLeadingZeroBits,
  solveProofOfWork,
  UnsupportedChallengeError,
} from "@/lib/helpers/headless-account";

const challenge = (difficulty: number, algorithm = "sha256") => ({
  challenge: "eyJhbGciOiJIUzI1NiJ9.eyJkaWZmaWN1bHR5IjoyMH0.c2lnbmF0dXJl",
  difficulty,
  algorithm,
  expires_at: "2026-10-29T12:05:00.000Z",
});

const sha256 = (input: string) =>
  crypto.createHash("sha256").update(input).digest();

describe("lib/helpers/headless-account", () => {
  describe("hasLeadingZeroBits", () => {
    it("counts whole bytes and the bits of the next one", () => {
      const digest = Buffer.from([0x00, 0x0f, 0xff]);

      expect(hasLeadingZeroBits(digest, 0)).to.equal(true);
      expect(hasLeadingZeroBits(digest, 8)).to.equal(true);
      expect(hasLeadingZeroBits(digest, 12)).to.equal(true);
      expect(hasLeadingZeroBits(digest, 13)).to.equal(false);
      expect(hasLeadingZeroBits(digest, 16)).to.equal(false);
    });
  });

  describe("solveProofOfWork", () => {
    for (const difficulty of [0, 1, 7, 8, 12, 16]) {
      it(`finds a nonce at difficulty ${difficulty}`, async () => {
        const solution = await solveProofOfWork(challenge(difficulty));
        const digest = sha256(
          `${challenge(difficulty).challenge}:${solution.nonce}`,
        );

        expect(solution.challenge).to.equal(challenge(difficulty).challenge);
        expect(solution.nonce).to.match(/^\d+$/);
        expect(hasLeadingZeroBits(digest, difficulty)).to.equal(true);
      });
    }

    it("returns the first nonce that works, counting up from 0", async () => {
      const { nonce } = await solveProofOfWork(challenge(8));

      for (let n = 0; n < Number(nonce); n++) {
        const digest = sha256(`${challenge(8).challenge}:${n}`);
        expect(hasLeadingZeroBits(digest, 8)).to.equal(false);
      }
    });

    it("refuses an algorithm it doesn't know", async () => {
      const error = await solveProofOfWork(challenge(8, "argon2id")).catch(
        (error_) => error_,
      );

      expect(error).to.be.instanceOf(UnsupportedChallengeError);
      expect(error.message).to.contain("(argon2id)");
    });

    it("refuses a difficulty it can't solve", async () => {
      const error = await solveProofOfWork(challenge(257)).catch(
        (error_) => error_,
      );

      expect(error).to.be.instanceOf(UnsupportedChallengeError);
    });
  });

  describe("formatWait", () => {
    it("rounds up to the largest unit that fits", () => {
      expect(formatWait(1)).to.equal("1 second");
      expect(formatWait(59)).to.equal("59 seconds");
      expect(formatWait(60)).to.equal("1 minute");
      expect(formatWait(61)).to.equal("2 minutes");
      expect(formatWait(3599)).to.equal("60 minutes");
      expect(formatWait(3600)).to.equal("1 hour");
      expect(formatWait(86_400)).to.equal("24 hours");
    });
  });
});
