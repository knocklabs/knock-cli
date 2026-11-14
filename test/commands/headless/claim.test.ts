import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import nock from "nock";

import { DEFAULT_API_URL } from "@/lib/urls";

const EMAIL = "person@example.com";

const claim = {
  claim_url: "https://dashboard.knock.app/claim-account?token=abc",
  user_code: "042917",
  expires_at: "2026-10-28T12:10:00.000Z",
};

const mockClaim = (email = EMAIL) =>
  nock(DEFAULT_API_URL, {
    reqheaders: { authorization: "Bearer valid-token" },
  })
    .post("/v1/headless_accounts/claim", { email })
    .reply(200, claim);

const mockClaimError = (status: number, code: string, message: string) =>
  nock(DEFAULT_API_URL)
    .post("/v1/headless_accounts/claim")
    .reply(status, { code, message });

describe("commands/headless/claim", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("given no token", () => {
    test
      .command(["headless claim", "--email", EMAIL])
      .catch(/No token found/)
      .it("refuses to run");
  });

  describe("given an email", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .do(() => mockClaim())
      .command(["headless claim", "--email", EMAIL])
      .it("shows the link and the code", (ctx) => {
        expect(nock.isDone()).to.equal(true);

        expect(ctx.stdout).to.contain(`claim for ${EMAIL}`);
        expect(ctx.stdout).to.contain(claim.claim_url);
        expect(ctx.stdout).to.contain(claim.user_code);
        expect(ctx.stdout).to.contain(claim.expires_at);
        expect(ctx.stdout).to.contain("knock headless status");
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .do(() => mockClaim())
      .command(["headless claim", "--email", EMAIL, "--json"])
      .it("returns the claim with --json", (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.eql(claim);
      });
  });

  describe("given no email and no terminal to ask in", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["headless claim"])
      .catch(/Pass it with --email/)
      .it("says to pass one");
  });

  describe("given no email in a terminal", () => {
    const { isTTY } = process.stdin;

    beforeEach(() => {
      process.stdin.isTTY = true;
    });

    afterEach(() => {
      process.stdin.isTTY = isTTY;
    });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .stub(enquirer.prototype, "prompt", (stub) =>
        stub.resolves({ email: EMAIL }),
      )
      .do(() => mockClaim())
      .command(["headless claim"])
      .it("asks for it", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(ctx.stdout).to.contain(claim.claim_url);
      });

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(enquirer.prototype, "prompt", (stub) => stub.rejects())
      .command(["headless claim"])
      .catch(/Pass it with --email/)
      .it("stops if the prompt is cancelled");
  });

  describe("given a token that isn't for a headless account", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() =>
        mockClaimError(
          403,
          "headless_account_required",
          "This endpoint is only available to tokens issued for a headless account",
        ),
      )
      .command(["headless claim", "--email", EMAIL])
      .catch(/headless account Use the service token from `knock signup/)
      .it("says which token to use");
  });

  describe("given an expired account", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() =>
        mockClaimError(
          410,
          "headless_account_expired",
          "The claim window for this headless account has closed",
        ),
      )
      .command(["headless claim", "--email", EMAIL])
      .catch(/has closed Run `knock signup`/)
      .it("says to create a new account");
  });

  describe("given an account that's still being set up", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() =>
        mockClaimError(
          409,
          "headless_account_not_ready",
          "The account is still being set up. Check its status and try again.",
        ),
      )
      .command(["headless claim", "--email", EMAIL])
      .catch(/still being set up/)
      .it("passes on the api's message");
  });

  describe("given too many claims", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        nock(DEFAULT_API_URL)
          .post("/v1/headless_accounts/claim")
          .reply(
            429,
            { code: "rate_limited", message: "Too many requests" },
            { "retry-after": "300" },
          );
      })
      .command(["headless claim", "--email", EMAIL])
      .catch(/Try again in 300 seconds\./)
      .it("says when to try again");
  });

  describe("given an invalid email", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        nock(DEFAULT_API_URL).post("/v1/headless_accounts/claim").reply(422, {
          code: "invalid_params",
          message: "email must be a valid email address.",
        });
      })
      .command(["headless claim", "--email", "not-an-email"])
      .catch(/email must be a valid email address/)
      .it("passes on the api's message");
  });
});
