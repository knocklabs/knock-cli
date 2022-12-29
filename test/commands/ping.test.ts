import { expect, test } from "@oclif/test";

import UserConfig from "@/lib/user-config";

describe("commands/ping", () => {
  describe("given a valid service token via flag", () => {
    test
      .nock("https://control.knock.app", (api) =>
        api.get("/v1/ping").reply(200, "pong"),
      )
      .stdout()
      .command(["ping", "--service-token", "valid-token"])
      .it("runs the command to make a ping request", (ctx) => {
        expect(ctx.stdout).to.contain("pong");
      });
  });

  describe("given a valid service token via env var", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .nock("https://control.knock.app", (api) =>
        api.get("/v1/ping").reply(200, "pong"),
      )
      .stdout()
      .command(["ping"])
      .it("runs the command to make a ping request", (ctx) => {
        expect(ctx.stdout).to.contain("pong");
      });
  });

  describe("given a valid service token via user config", () => {
    test
      .stub(UserConfig, "get", () => ({
        serviceToken: "valid-token",
      }))
      .nock("https://control.knock.app", (api) =>
        api.get("/v1/ping").reply(200, "pong"),
      )
      .stdout()
      .command(["ping"])
      .it("runs the command to make a ping request", (ctx) => {
        expect(ctx.stdout).to.contain("pong");
      });
  });

  describe("given no service token flag", () => {
    test.command(["ping"]).exit(2).it("exists with status 2");
  });
});
