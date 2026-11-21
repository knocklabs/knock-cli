import crypto from "node:crypto";

import { AxiosResponse } from "axios";

import { formatErrorRespMessage } from "./request";

// What to do next, for the errors the API's own message doesn't cover.
const NEXT_STEPS: Record<string, string> = {
  headless_account_required:
    "Use the service token from `knock signup`, by passing --service-token or setting KNOCK_SERVICE_TOKEN.",
  headless_account_expired: "Run `knock signup` to create a new account.",
  headless_account_limit_reached:
    "To have a person claim one, run `knock headless claim --email <email>` with that account's token.",
};

/*
 * Returns how long to wait, rounded up so a retry doesn't come too early. The
 * wait for an unclaimed account to expire can be hours.
 */
export const formatWait = (seconds: number): string => {
  const [value, unit] =
    seconds < 60
      ? [seconds, "second"]
      : seconds < 3600
      ? [Math.ceil(seconds / 60), "minute"]
      : [Math.ceil(seconds / 3600), "hour"];

  return `${value} ${unit}${value === 1 ? "" : "s"}`;
};

/*
 * Returns the message for a headless account error response, with what to do
 * next. The API sends a Retry-After header with its 429s and 503s.
 */
export const formatHeadlessAccountError = (resp: AxiosResponse): string => {
  const retryAfter = Number(resp.headers?.["retry-after"]);

  return [
    formatErrorRespMessage(resp),
    retryAfter > 0 && `Try again in ${formatWait(retryAfter)}.`,
    NEXT_STEPS[resp.data?.code],
  ]
    .filter(Boolean)
    .join(" ");
};

export type ProofOfWorkChallenge = {
  challenge: string;
  difficulty: number;
  algorithm: string;
  expires_at: string;
};

export type ProofOfWorkSolution = { challenge: string; nonce: string };

const PROOF_OF_WORK_CODES = new Set([
  "proof_of_work_required",
  "proof_of_work_invalid",
]);

/*
 * Returns the challenge from a create response that asks for proof of work.
 * Either code comes with a new challenge to solve.
 */
export const proofOfWorkChallenge = (
  resp: AxiosResponse,
): ProofOfWorkChallenge | undefined => {
  if (resp.status !== 400) return undefined;
  if (!PROOF_OF_WORK_CODES.has(resp.data?.code)) return undefined;

  return resp.data.challenge;
};

export const hasLeadingZeroBits = (digest: Buffer, bits: number): boolean => {
  const wholeBytes = Math.floor(bits / 8);

  for (let i = 0; i < wholeBytes; i++) {
    if (digest[i] !== 0) return false;
  }

  const remainingBits = bits % 8;
  return remainingBits === 0 || digest[wholeBytes] >> (8 - remainingBits) === 0;
};

export class UnsupportedChallengeError extends Error {}

// Hashing blocks the event loop, so give way now and then to keep the spinner
// turning.
const HASHES_PER_YIELD = 50_000;

/*
 * Finds a nonce for which the SHA-256 hash of `<challenge>:<nonce>` starts
 * with `difficulty` zero bits, counting up from 0. That takes about
 * 2^difficulty hashes.
 */
export const solveProofOfWork = async ({
  challenge,
  difficulty,
  algorithm,
}: ProofOfWorkChallenge): Promise<ProofOfWorkSolution> => {
  if (algorithm !== "sha256") {
    throw new UnsupportedChallengeError(
      `Knock asked for a proof of work with an algorithm this version of the CLI doesn't support (${algorithm}). Update the Knock CLI, then try again.`,
    );
  }

  if (!Number.isInteger(difficulty) || difficulty < 0 || difficulty > 256) {
    throw new UnsupportedChallengeError(
      `Knock asked for a proof of work with a difficulty this version of the CLI doesn't support (${difficulty}). Update the Knock CLI, then try again.`,
    );
  }

  // Hash the shared prefix once, and copy it for each nonce.
  const prefix = crypto.createHash("sha256").update(`${challenge}:`);

  for (let n = 0; ; n++) {
    const nonce = String(n);
    const digest = prefix.copy().update(nonce).digest();

    if (hasLeadingZeroBits(digest, difficulty)) return { challenge, nonce };

    if (n % HASHES_PER_YIELD === HASHES_PER_YIELD - 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
    }
  }
};

// Wrapped in an object so tests can skip the wait.
export const timer = {
  async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  },
};
