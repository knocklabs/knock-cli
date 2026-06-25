import { expect, test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/source/get", () => {
  describe("given no source key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["source get"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a source key arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getSource", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.source(),
          }),
        ),
      )
      .stdout()
      .command(["source get", "foo"])
      .it("calls apiV1 getSource with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getSource as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                sourceKey: "foo",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
              }),
          ),
        );
      });
  });

  describe("given a source key arg, and flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getSource", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.source(),
          }),
        ),
      )
      .stdout()
      .command(["source get", "foo", "--environment", "staging"])
      .it("calls apiV1 getSource with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getSource as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                sourceKey: "foo",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "staging",
              }),
          ),
        );
      });
  });

  describe("given a source in response", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getSource", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.source({ key: "my-source" }),
          }),
        ),
      )
      .stdout()
      .command(["source get", "my-source"])
      .it("displays the source and its environment settings", (ctx) => {
        expect(ctx.stdout).to.contain("Showing source `my-source`");
        expect(ctx.stdout).to.contain("my-source");
        expect(ctx.stdout).to.contain("Settings (development)");
        expect(ctx.stdout).to.contain("Endpoint");
        expect(ctx.stdout).to.contain(
          "https://api.knock.app/integrations/receive/abc123",
        );
      });
  });

  describe("given a source key that does not exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "getSource", (stub) =>
        stub.resolves(
          factory.resp({
            status: 404,
            statusText: "Not found",
            data: {
              code: "resource_missing",
              message: "The resource you requested does not exist",
              status: 404,
              type: "api_error",
            },
          }),
        ),
      )
      .stdout()
      .command(["source get", "foo"])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });
});
