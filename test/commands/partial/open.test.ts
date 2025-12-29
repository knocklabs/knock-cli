import { test } from "@oclif/test";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import { browser } from "@/lib/helpers/browser";

describe("commands/partial/open", () => {
  const whoami = {
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: "My cool token",
  };

  describe("given no partial key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["partial open"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a partial key arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["partial open", "foo"])
      .it("opens the correct URL", () => {
        sinon.assert.calledWith(
          browser.openUrl as any,
          "https://dashboard.knock.app/collab-io/development/partials/foo",
        );
      });
  });

  describe("given a partial key arg and environment flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["partial open", "foo", "--environment", "production"])
      .it("opens the correct URL with production environment", () => {
        sinon.assert.calledWith(
          browser.openUrl as any,
          "https://dashboard.knock.app/collab-io/production/partials/foo",
        );
      });
  });

  describe("given a partial key arg and branch flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(browser, "openUrl", (stub) => stub.resolves())
      .stdout()
      .command(["partial open", "foo", "--branch", "my-feature-branch-123"])
      .it("opens the correct URL with branch", () => {
        sinon.assert.calledWith(
          browser.openUrl as any,
          "https://dashboard.knock.app/collab-io/my-feature-branch-123/partials/foo",
        );
      });
  });
});
