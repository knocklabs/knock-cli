import { expect, test } from "@oclif/test";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/channel/list", () => {
  describe("given no channels", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAllChannels", (stub) =>
        stub.resolves([]),
      )
      .stdout()
      .command(["channel list"])
      .it("displays an empty list of channels", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 0 channels");
      });
  });

  describe("given a list of channels in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAllChannels", (stub) =>
        stub.resolves([
          factory.channel({
            key: "channel-1",
            name: "Channel 1",
            updated_at: "2024-01-01T00:00:00Z",
          }),
          factory.channel({
            key: "channel-2",
            name: "Channel 2",
            updated_at: "2024-01-02T00:00:00Z",
          }),
          factory.channel({
            key: "channel-3",
            name: "Channel 3",
            updated_at: "2024-01-03T00:00:00Z",
          }),
        ]),
      )
      .stdout()
      .command(["channel list"])
      .it("displays the list of channels", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 3 channels");
        expect(ctx.stdout).to.contain("channel-1");
        expect(ctx.stdout).to.contain("channel-2");
        expect(ctx.stdout).to.contain("channel-3");

        expect(ctx.stdout).to.not.contain("channel-4");
      });
  });

  describe("given --json flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAllChannels", (stub) =>
        stub.resolves([
          factory.channel({
            key: "channel-1",
            name: "Channel 1",
            updated_at: "2024-01-01T00:00:00Z",
          }),
        ]),
      )
      .stdout()
      .command(["channel list", "--json"])
      .it("outputs channels as JSON", (ctx) => {
        const output = JSON.parse(ctx.stdout);
        expect(output).to.be.an("array");
        expect(output).to.have.lengthOf(1);
        expect(output[0]).to.have.property("key", "channel-1");
      });
  });
});
