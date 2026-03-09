import { expect, test } from "@oclif/test";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { browser } from "@/lib/helpers/browser";

describe("commands/audience/open", () => {
  const whoami = {
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: "My cool token",
  };

  describe("given no audience key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["audience open"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given an audience key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["audience open", "vip-users"])
      .it("opens the audience in the dashboard", (ctx) => {
        expect(ctx.stdout).to.contain("Opening audience `vip-users`");
        sinon.assert.calledOnce(browser.openUrl as any);
      });
  });

  describe("given an audience key arg with environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["audience open", "vip-users", "--environment", "staging"])
      .it("opens the audience in the staging environment", (ctx) => {
        expect(ctx.stdout).to.contain("Opening audience `vip-users`");
        sinon.assert.calledOnce(browser.openUrl as any);
        sinon.assert.calledWith(
          browser.openUrl as any,
          sinon.match(/staging\/audiences\/vip-users/),
        );
      });
  });

  describe("given an audience key arg with branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["audience open", "vip-users", "--branch", "my-feature-branch"])
      .it("opens the audience with branch in URL", (ctx) => {
        expect(ctx.stdout).to.contain("Opening audience `vip-users`");
        sinon.assert.calledOnce(browser.openUrl as any);
        sinon.assert.calledWith(
          browser.openUrl as any,
          sinon.match(/my-feature-branch\/audiences\/vip-users/),
        );
      });
  });
});
