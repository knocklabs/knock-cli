import { expect, test } from "@oclif/test";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";
import UserConfig from "@/lib/user-config";

describe("commands/ping", () => {
  describe("given a valid service token via flag", () => {
    test
      .stub(KnockApiV1.prototype, "ping", (stub) =>
        stub.resolves(factory.resp({ data: "pong" })),
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
      .stub(KnockApiV1.prototype, "ping", (stub) =>
        stub.resolves(factory.resp({ data: "pong" })),
      )
      .stdout()
      .command(["ping"])
      .it("runs the command to make a ping request", (ctx) => {
        expect(ctx.stdout).to.contain("pong");
      });
  });

  describe("given a valid service token via user config", () => {
    test
      .stub(UserConfig, "get", (stub) =>
        stub.returns({ serviceToken: "valid-token" }),
      )
      .stub(KnockApiV1.prototype, "ping", (stub) =>
        stub.resolves(factory.resp({ data: "pong" })),
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
