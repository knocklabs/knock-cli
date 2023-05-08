import { expect, test } from "@oclif/test";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import UserConfig from "@/lib/user-config";

describe("commands/whoami", () => {
  const data = {
    account_name: "Collab.io",
    service_token_name: "My cool token",
  };

  describe("given a valid service token via flag", () => {
    test
      .stub(KnockApiV1.prototype, "whoami", () => factory.resp({ data }))
      .stdout()
      .command(["whoami", "--service-token", "valid-token"])
      .it("runs the command to make a whoami request", (ctx) => {
        expect(ctx.stdout).to.contain("Account name: Collab.io");
        expect(ctx.stdout).to.contain("Service token name: My cool token");
      });
  });

  describe("given a valid service token via env var", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", () => factory.resp({ data }))
      .stdout()
      .command(["whoami"])
      .it("runs the command to make a whoami request", (ctx) => {
        expect(ctx.stdout).to.contain("Account name: Collab.io");
        expect(ctx.stdout).to.contain("Service token name: My cool token");
      });
  });

  describe("given a valid service token via user config", () => {
    test
      .stub(UserConfig, "get", () => ({ serviceToken: "valid-token" }))
      .stub(KnockApiV1.prototype, "whoami", () => factory.resp({ data }))
      .stdout()
      .command(["whoami"])
      .it("runs the command to make a whoami request", (ctx) => {
        expect(ctx.stdout).to.contain("Account name: Collab.io");
        expect(ctx.stdout).to.contain("Service token name: My cool token");
      });
  });

  describe("given no service token flag", () => {
    test.command(["whoami"]).exit(2).it("exists with status 2");
  });
});
