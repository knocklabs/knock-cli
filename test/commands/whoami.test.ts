import { type AuthVerifyResponse } from "@knocklabs/mgmt/resources/auth";
import { expect, test } from "@oclif/test";
import nock from "nock";

import UserConfig from "@/lib/user-config";

describe("commands/whoami", () => {
  const data: AuthVerifyResponse = {
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: "My cool token",
  };

  beforeEach(() => {
    nock("https://control.knock.app").get("/v1/whoami").reply(200, data);
  });

  describe("given a valid service token via flag", () => {
    test
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
      .stdout()
      .command(["whoami"])
      .it("runs the command to make a whoami request", (ctx) => {
        expect(ctx.stdout).to.contain("Account name: Collab.io");
        expect(ctx.stdout).to.contain("Service token name: My cool token");
      });
  });

  describe("given a valid service token via user config", () => {
    test
      .stub(UserConfig, "get", (stub) =>
        stub.returns({ serviceToken: "valid-token" }),
      )
      .stdout()
      .command(["whoami"])
      .it("runs the command to make a whoami request", (ctx) => {
        expect(ctx.stdout).to.contain("Account name: Collab.io");
        expect(ctx.stdout).to.contain("Service token name: My cool token");
      });
  });

  describe("given no service token flag", () => {
    test.command(["whoami"]).exit(2).it("exits with status 2");
  });
});
