import { test } from "@oclif/test";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { browser } from "@/lib/helpers/browser";

describe("commands/workflow/open", () => {
  const whoami = {
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: "My cool token",
  };

  describe("given no workflow key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["workflow open"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a workflow key arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["workflow open", "foo"])
      .it("opens the correct URL", () => {
        sinon.assert.calledWith(
          browser.openUrl as any,
          "https://dashboard.knock.app/collab-io/development/workflows/foo",
        );
      });
  });

  describe("given a workflow key arg and environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["workflow open", "foo", "--environment", "production"])
      .it("opens the correct URL with production environment", () => {
        sinon.assert.calledWith(
          browser.openUrl as any,
          "https://dashboard.knock.app/collab-io/production/workflows/foo",
        );
      });
  });

  describe("given a workflow key arg and branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["workflow open", "foo", "--branch", "my-feature-branch-123"])
      .it("opens the correct URL with branch", () => {
        sinon.assert.calledWith(
          browser.openUrl as any,
          "https://dashboard.knock.app/collab-io/my-feature-branch-123/workflows/foo",
        );
      });
  });
});
