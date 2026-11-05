import { expect, test } from "@oclif/test";
import nock from "nock";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import auth from "@/lib/auth";
import { browser } from "@/lib/helpers/browser";
import { timer } from "@/lib/helpers/headless-account";
import { DEFAULT_API_URL, DEFAULT_DASHBOARD_URL } from "@/lib/urls";
import { UserConfigStore } from "@/lib/user-config";

const TOKEN = "knock_st_headless";
const EXPIRES_AT = "2026-10-29T12:00:00.000Z";

const created = {
  token: TOKEN,
  status: "provisioning",
  expires_at: EXPIRES_AT,
};

const mockCreate = () =>
  nock(DEFAULT_API_URL, { badheaders: ["authorization"] })
    .post("/v1/headless_accounts")
    .reply(201, created);

const mockStatus = (status: string) =>
  nock(DEFAULT_API_URL, {
    reqheaders: { authorization: `Bearer ${TOKEN}` },
  })
    .get("/v1/headless_accounts/status")
    .reply(200, { status, expires_at: EXPIRES_AT });

describe("commands/signup", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("without --headless", () => {
    test
      .stdout()
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .command(["signup"])
      .it("opens the signup page in the dashboard", (ctx) => {
        const url = `${DEFAULT_DASHBOARD_URL}/signup`;

        sinon.assert.calledOnceWithExactly(browser.openUrl as any, url);
        expect(ctx.stdout).to.contain(url);
      });

    test
      .stdout()
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .command(["signup", "--json"])
      .it("returns the url with --json", (ctx) => {
        expect(JSON.parse(ctx.stdout)).to.eql({
          signup_url: `${DEFAULT_DASHBOARD_URL}/signup`,
        });
      });
  });

  describe("with --headless", () => {
    describe("given no existing credentials", () => {
      test
        .stdout()
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .stub(browser, "openUrl", (stub) => stub.resolves())
        .do(() => {
          mockCreate();
          mockStatus("unclaimed");
        })
        .command(["signup", "--headless"])
        .it("creates the account and saves the token", (ctx) => {
          expect(nock.isDone()).to.equal(true);

          sinon.assert.calledOnceWithExactly(
            UserConfigStore.prototype.set as any,
            { serviceToken: TOKEN },
          );
          sinon.assert.notCalled(browser.openUrl as any);

          expect(ctx.stdout).to.contain("Status: unclaimed");
          expect(ctx.stdout).to.contain(`Expires at: ${EXPIRES_AT}`);
          expect(ctx.stdout).to.contain("saved to your Knock config");
          expect(ctx.stdout).to.contain("knock headless claim --email");
          expect(ctx.stdout).to.not.contain(TOKEN);
        });

      test
        .stdout()
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .do(() => {
          mockCreate();
          mockStatus("unclaimed");
        })
        .command(["signup", "--headless", "--json"])
        .it("returns the token with --json", (ctx) => {
          expect(JSON.parse(ctx.stdout)).to.eql({
            token: TOKEN,
            token_saved: true,
            status: "unclaimed",
            expires_at: EXPIRES_AT,
          });
        });
    });

    describe("given the account takes a while to set up", () => {
      test
        .stdout()
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .stub(timer, "sleep", (stub) => stub.resolves())
        .do(() => {
          mockCreate();
          mockStatus("provisioning");
          mockStatus("provisioning");
          mockStatus("unclaimed");
        })
        .command(["signup", "--headless"])
        .it("polls every five seconds until it is ready", (ctx) => {
          expect(nock.isDone()).to.equal(true);

          sinon.assert.calledTwice(timer.sleep as any);
          sinon.assert.alwaysCalledWithExactly(timer.sleep as any, 5000);

          expect(ctx.stdout).to.contain("Status: unclaimed");
        });

      test
        .stdout()
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .stub(timer, "sleep", (stub) => stub.resolves())
        .do(() => {
          mockCreate();
          nock(DEFAULT_API_URL)
            .persist()
            .get("/v1/headless_accounts/status")
            .reply(200, { status: "provisioning", expires_at: EXPIRES_AT });
        })
        .command(["signup", "--headless"])
        .it("gives up waiting without failing", (ctx) => {
          sinon.assert.callCount(timer.sleep as any, 24);

          expect(ctx.stdout).to.contain("Status: provisioning");
          expect(ctx.stdout).to.contain("still being set up");
        });
    });

    describe("given the status check fails", () => {
      test
        .stdout()
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .stub(timer, "sleep", (stub) => stub.resolves())
        .do(() => {
          mockCreate();
          nock(DEFAULT_API_URL)
            .get("/v1/headless_accounts/status")
            .replyWithError("socket hang up");
          nock(DEFAULT_API_URL)
            .get("/v1/headless_accounts/status")
            .reply(502, {});
          mockStatus("unclaimed");
        })
        .command(["signup", "--headless", "--json"])
        .it("keeps the account and checks again", (ctx) => {
          expect(JSON.parse(ctx.stdout)).to.include({
            token: TOKEN,
            status: "unclaimed",
          });
        });
    });

    describe("given the account expires during setup", () => {
      test
        .stdout()
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .do(() => {
          mockCreate();
          mockStatus("expired");
        })
        .command(["signup", "--headless"])
        .it("says to create a new one", (ctx) => {
          expect(ctx.stdout).to.contain("The account has expired.");
          expect(ctx.stdout).to.not.contain("knock headless claim");
        });
    });

    describe("given a service token through the environment", () => {
      test
        .env({ KNOCK_SERVICE_TOKEN: "existing-token" })
        .stdout()
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .do(() => {
          mockCreate();
          mockStatus("unclaimed");
        })
        .command(["signup", "--headless"])
        .it("prints the token instead of saving it", (ctx) => {
          expect(nock.isDone()).to.equal(true);

          sinon.assert.notCalled(UserConfigStore.prototype.set as any);

          expect(ctx.stdout).to.contain("was not saved");
          expect(ctx.stdout).to.contain(`KNOCK_SERVICE_TOKEN=${TOKEN}`);
        });
    });

    describe("given a service token in the user config", () => {
      test
        .stdout()
        .stub(UserConfigStore.prototype, "get", (stub) =>
          stub.returns({ serviceToken: "existing-token" }),
        )
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .do(() => {
          mockCreate();
          mockStatus("unclaimed");
        })
        .command(["signup", "--headless", "--json"])
        .it("leaves it in place", (ctx) => {
          sinon.assert.notCalled(UserConfigStore.prototype.set as any);

          expect(JSON.parse(ctx.stdout)).to.include({
            token: TOKEN,
            token_saved: false,
          });
        });
    });

    describe("given a logged in user", () => {
      const session = factory.authenticatedSession();

      test
        .stdout()
        .stub(UserConfigStore.prototype, "get", (stub) =>
          stub.returns({ userSession: session }),
        )
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .stub(auth, "refreshAccessToken", (stub) => stub.resolves(session))
        .do(() => {
          nock(DEFAULT_API_URL, {
            badheaders: ["authorization", "x-knock-client-id"],
          })
            .post("/v1/headless_accounts")
            .reply(201, created);
          nock(DEFAULT_API_URL, {
            reqheaders: { authorization: `Bearer ${TOKEN}` },
            badheaders: ["x-knock-client-id"],
          })
            .get("/v1/headless_accounts/status")
            .reply(200, { status: "unclaimed", expires_at: EXPIRES_AT });
        })
        .command(["signup", "--headless"])
        .it("doesn't send the session, and prints the token", (ctx) => {
          expect(nock.isDone()).to.equal(true);

          expect(ctx.stdout).to.contain("logged in");
          expect(ctx.stdout).to.contain(`KNOCK_SERVICE_TOKEN=${TOKEN}`);

          sinon.assert.neverCalledWith(UserConfigStore.prototype.set as any, {
            serviceToken: TOKEN,
          });
        });
    });

    describe("given the api rate limits the request", () => {
      test
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .do(() => {
          nock(DEFAULT_API_URL)
            .post("/v1/headless_accounts")
            .reply(
              429,
              { code: "rate_limited", message: "Too many requests" },
              { "retry-after": "120" },
            );
        })
        .command(["signup", "--headless"])
        .catch(/Too many requests Try again in 120 seconds\./)
        .it("says when to try again");
    });

    describe("given headless accounts are unavailable", () => {
      test
        .do(() => {
          nock(DEFAULT_API_URL).post("/v1/headless_accounts").reply(
            503,
            {
              code: "headless_accounts_unavailable",
              message: "Headless accounts are temporarily unavailable.",
            },
            { "retry-after": "60" },
          );
        })
        .command(["signup", "--headless"])
        .catch(/temporarily unavailable\. Try again in 60 seconds\./)
        .it("says when to try again");
    });
  });
});
