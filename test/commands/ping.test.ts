import { expect, test } from "@oclif/test";

describe("commands/ping", () => {
  test
    .nock("https://control.knock.app", (api) =>
      api.get("/v1/ping").reply(200, "pong"),
    )
    .stdout()
    .command(["ping", "--service-token", "valid-token"])
    .it("runs ping with a valid service token", (ctx) => {
      expect(ctx.stdout).to.contain("pong");
    });
});
