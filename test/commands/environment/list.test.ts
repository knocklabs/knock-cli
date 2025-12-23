import { expect, test } from "@oclif/test";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/environment/list", () => {
  describe("given no environments", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAllEnvironments", (stub) =>
        stub.resolves([]),
      )
      .stdout()
      .command(["environment list"])
      .it("displays an empty list of environments", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 0 environments");
      });
  });

  describe("given a list of environments in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAllEnvironments", (stub) =>
        stub.resolves([
          factory.environment({
            slug: "development",
            name: "Development",
            order: 1,
            updated_at: "2024-01-01T00:00:00Z",
          }),
          factory.environment({
            slug: "staging",
            name: "Staging",
            order: 2,
            updated_at: "2024-01-02T00:00:00Z",
          }),
          factory.environment({
            slug: "production",
            name: "Production",
            order: 3,
            updated_at: "2024-01-03T00:00:00Z",
          }),
        ]),
      )
      .stdout()
      .command(["environment list"])
      .it("displays the list of environments", (ctx) => {
        expect(ctx.stdout).to.contain("Showing 3 environments");
        expect(ctx.stdout).to.contain("development");
        expect(ctx.stdout).to.contain("staging");
        expect(ctx.stdout).to.contain("production");

        expect(ctx.stdout).to.not.contain("test-environment");
      });
  });

  describe("given --json flag", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "listAllEnvironments", (stub) =>
        stub.resolves([
          factory.environment({
            slug: "development",
            name: "Development",
            updated_at: "2024-01-01T00:00:00Z",
          }),
        ]),
      )
      .stdout()
      .command(["environment list", "--json"])
      .it("outputs environments as JSON", (ctx) => {
        const output = JSON.parse(ctx.stdout);
        expect(output).to.be.an("array");
        expect(output).to.have.lengthOf(1);
        expect(output[0]).to.have.property("slug", "development");
      });
  });
});
