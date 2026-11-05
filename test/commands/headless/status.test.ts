import { expect, test } from "@oclif/test";
import nock from "nock";

import { DEFAULT_API_URL } from "@/lib/urls";
import { UserConfigStore } from "@/lib/user-config";

const EXPIRES_AT = "2026-10-29T12:00:00.000Z";

const mockStatus = (status: string, expires_at: string | null, token: string) =>
  nock(DEFAULT_API_URL, { reqheaders: { authorization: `Bearer ${token}` } })
    .get("/v1/headless_accounts/status")
    .reply(200, { status, expires_at });

describe("commands/headless/status", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("given no token", () => {
    test
      .command(["headless status"])
      .catch(/No token found/)
      .it("refuses to run");
  });

  describe("given a token saved by signup", () => {
    test
      .stdout()
      .stub(UserConfigStore.prototype, "get", (stub) =>
        stub.returns({ serviceToken: "saved-token" }),
      )
      .do(() => mockStatus("unclaimed", EXPIRES_AT, "saved-token"))
      .command(["headless status"])
      .it("uses it", (ctx) => {
        expect(nock.isDone()).to.equal(true);
        expect(ctx.stdout).to.contain("Status: unclaimed");
      });
  });

  describe("given each status", () => {
    const cases = [
      ["provisioning", EXPIRES_AT, "still being set up"],
      ["unclaimed", EXPIRES_AT, "knock headless claim --email"],
      ["expired", EXPIRES_AT, "knock signup --headless"],
    ];

    for (const [status, expiresAt, nextStep] of cases) {
      test
        .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
        .stdout()
        .do(() => mockStatus(status, expiresAt, "valid-token"))
        .command(["headless status"])
        .it(`says what to do when ${status}`, (ctx) => {
          expect(ctx.stdout).to.contain(`Status: ${status}`);
          expect(ctx.stdout).to.contain(`Expires at: ${expiresAt}`);
          expect(ctx.stdout).to.contain(nextStep);
        });
    }

    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .do(() => mockStatus("claimed", null, "valid-token"))
      .command(["headless status"])
      .it("leaves out the expiry once claimed", (ctx) => {
        expect(ctx.stdout).to.contain("Status: claimed");
        expect(ctx.stdout).to.contain("keeps working");
        expect(ctx.stdout).to.not.contain("Expires at");
      });
  });

  describe("given --json", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stdout()
      .do(() => mockStatus("claimed", null, "valid-token"))
      .command(["headless status", "--json"])
      .it("returns the status", (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.eql({
          status: "claimed",
          expires_at: null,
        });
      });
  });

  describe("given a token that isn't for a headless account", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        nock(DEFAULT_API_URL).get("/v1/headless_accounts/status").reply(403, {
          code: "headless_account_required",
          message: "Only for headless accounts",
        });
      })
      .command(["headless status"])
      .catch(/Use the service token from `knock signup --headless`/)
      .it("says which token to use");
  });

  describe("given it's polled too quickly", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .do(() => {
        nock(DEFAULT_API_URL)
          .get("/v1/headless_accounts/status")
          .reply(
            429,
            { code: "rate_limited", message: "Too many requests" },
            { "retry-after": "1" },
          );
      })
      .command(["headless status"])
      .catch(/Try again in 1 second\./)
      .it("says when to try again");
  });
});
