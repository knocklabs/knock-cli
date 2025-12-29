import { test } from "@oclif/test";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { browser } from "@/lib/helpers/browser";

describe("commands/guide/open", () => {
  const whoami = {
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: "My cool token",
  };

  describe("given no guide key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["guide open"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a guide key arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["guide open", "foo"])
      .it("opens the correct URL", () => {
        sinon.assert.calledWith(
          browser.openUrl as any,
          "https://dashboard.knock.app/collab-io/development/guides/foo",
        );
      });
  });

  describe("given a guide key arg and environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["guide open", "foo", "--environment", "production"])
      .it("opens the correct URL with production environment", () => {
        sinon.assert.calledWith(
          browser.openUrl as any,
          "https://dashboard.knock.app/collab-io/production/guides/foo",
        );
      });
  });

  describe("given a guide key arg and branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["guide open", "foo", "--branch", "my-feature-branch-123"])
      .it("opens the correct URL with branch", () => {
        sinon.assert.calledWith(
          browser.openUrl as any,
          "https://dashboard.knock.app/collab-io/my-feature-branch-123/guides/foo",
        );
      });
  });
});
