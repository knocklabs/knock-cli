import { expect, test } from "@oclif/test";
import enquirer from "enquirer";
import nock from "nock";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import auth from "@/lib/auth";
import { timer } from "@/lib/helpers/headless-account";
import { DEFAULT_API_URL } from "@/lib/urls";
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

  describe("without --force", () => {
    describe("in a terminal", () => {
      const { isTTY } = process.stdin;

      beforeEach(() => {
        process.stdin.isTTY = true;
      });

      afterEach(() => {
        process.stdin.isTTY = isTTY;
      });

      test
        .stdout()
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.resolves({ input: true }),
        )
        .do(() => {
          mockCreate();
          mockStatus("unclaimed");
        })
        .command(["signup"])
        .it("explains what it will do and asks first", (ctx) => {
          expect(nock.isDone()).to.equal(true);

          sinon.assert.calledOnce(enquirer.prototype.prompt as any);

          const [{ message }] = (enquirer.prototype.prompt as any).firstCall
            .args;
          expect(message).to.contain("new, temporary Knock account");
          expect(message).to.contain("claims it");

          expect(ctx.stdout).to.contain("Status: unclaimed");
        });

      test
        .stdout()
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .stub(enquirer.prototype, "prompt", (stub) =>
          stub.resolves({ input: false }),
        )
        .do(() => mockCreate())
        .command(["signup"])
        .it("creates nothing when declined", (ctx) => {
          expect(nock.isDone()).to.equal(false);

          sinon.assert.notCalled(UserConfigStore.prototype.set as any);

          expect(ctx.stdout).to.contain("Signup cancelled.");
        });

      test
        .stdout()
        .stub(enquirer.prototype, "prompt", (stub) => stub.resolves())
        .do(() => mockCreate())
        .command(["signup", "--json"])
        .it("doesn't prompt with --json, and says why", (ctx) => {
          sinon.assert.notCalled(enquirer.prototype.prompt as any);

          expect(nock.isDone()).to.equal(false);
          expect(JSON.parse(ctx.stdout).error.message).to.contain(
            "Pass --force",
          );
        });
    });

    describe("without a terminal", () => {
      test
        .do(() => mockCreate())
        .command(["signup"])
        .catch((error) => {
          expect(error.message).to.contain("Pass --force");
          expect(nock.isDone()).to.equal(false);
        })
        .it("says to pass --force instead of waiting on a prompt");
    });
  });

  describe("with --force", () => {
    describe("given no existing credentials", () => {
      test
        .stdout()
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .do(() => {
          mockCreate();
          mockStatus("unclaimed");
        })
        .command(["signup", "--force"])
        .it("creates the account and saves the token", (ctx) => {
          expect(nock.isDone()).to.equal(true);

          sinon.assert.calledOnceWithExactly(
            UserConfigStore.prototype.set as any,
            { serviceToken: TOKEN },
          );

          expect(ctx.stdout).to.contain("Status: unclaimed");
          expect(ctx.stdout).to.contain(`Expires at: ${EXPIRES_AT}`);
          expect(ctx.stdout).to.contain("saved to your Knock config");
          expect(ctx.stdout).to.contain(
            "To claim this account, run `knock headless claim --email <email>`.",
          );
          expect(ctx.stdout).to.not.contain(TOKEN);
        });

      test
        .stdout()
        .stub(UserConfigStore.prototype, "set", (stub) => stub.resolves())
        .do(() => {
          mockCreate();
          mockStatus("unclaimed");
        })
        .command(["signup", "--force", "--json"])
        .it("returns the token with --json", (ctx) => {
          expect(JSON.parse(ctx.stdout)).to.eql({
            token: TOKEN,
            token_saved: true,
            status: "unclaimed",
            expires_at: EXPIRES_AT,
            next_step:
              "To claim this account, run `knock headless claim --email <email>`.",
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
        .command(["signup", "--force"])
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
        .command(["signup", "--force"])
        .it("gives up waiting without failing", (ctx) => {
          sinon.assert.callCount(timer.sleep as any, 24);

          expect(ctx.stdout).to.contain("Status: provisioning");
          expect(ctx.stdout).to.contain("still being set up");
          expect(ctx.stdout).to.contain("knock headless status");
          expect(ctx.stdout).to.contain("knock headless claim --email");
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
        .command(["signup", "--force", "--json"])
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
        .command(["signup", "--force"])
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
        .command(["signup", "--force"])
        .it("prints the token instead of saving it", (ctx) => {
          expect(nock.isDone()).to.equal(true);

          sinon.assert.notCalled(UserConfigStore.prototype.set as any);

          expect(ctx.stdout).to.contain("was not saved");
          expect(ctx.stdout).to.contain(`KNOCK_SERVICE_TOKEN=${TOKEN}`);
          expect(ctx.stdout).to.contain(
            "with KNOCK_SERVICE_TOKEN set to the account's token",
          );
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
        .command(["signup", "--force", "--json"])
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
        .command(["signup", "--force"])
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
        .command(["signup", "--force"])
        .catch(/Too many requests Try again in 120 seconds\./)
        .it("says when to try again");
    });

    describe("given the api rate limits the request with --json", () => {
      test
        .stdout()
        .do(() => {
          nock(DEFAULT_API_URL)
            .post("/v1/headless_accounts")
            .reply(
              429,
              { code: "rate_limited", message: "Too many requests" },
              { "retry-after": "120" },
            );
        })
        .command(["signup", "--force", "--json"])
        .it("includes the message in the output", (ctx) => {
          expect(JSON.parse(ctx.stdout).error.message).to.equal(
            "Too many requests Try again in 120 seconds.",
          );
        });
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
        .command(["signup", "--force"])
        .catch(/temporarily unavailable\. Try again in 60 seconds\./)
        .it("says when to try again");
    });
  });
});
