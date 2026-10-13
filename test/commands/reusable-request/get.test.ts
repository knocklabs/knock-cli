import { expect, test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/reusable-request/get", () => {
  const whoami = {
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: "My cool token",
  };

  describe("given no reusable request key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["reusable-request get"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a reusable request key arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getReusableRequest", (stub) =>
        stub.resolves(factory.resp({ data: factory.reusableRequest() })),
      )
      .stdout()
      .command(["reusable-request get", "fetch-user"])
      .it("calls apiV1 getReusableRequest with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getReusableRequest as sinon.SinonStub,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { reusableRequestKey: "fetch-user" }) &&
              isEqual(flags, { "service-token": "valid-token" }),
          ),
        );
      });
  });

  describe("given a reusable request key arg, and flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getReusableRequest", (stub) =>
        stub.resolves(factory.resp({ data: factory.reusableRequest() })),
      )
      .stdout()
      .command([
        "reusable-request get",
        "fetch-user",
        "--hide-uncommitted-changes",
        "--environment",
        "staging",
        "--branch",
        "my-feature-branch-123",
        "--json",
      ])
      .it("calls apiV1 getReusableRequest and prints json", (ctx) => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getReusableRequest as sinon.SinonStub,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, { reusableRequestKey: "fetch-user" }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "hide-uncommitted-changes": true,
                environment: "staging",
                branch: "my-feature-branch-123",
                json: true,
              }),
          ),
        );

        const parsed = JSON.parse(ctx.stdout);
        expect(parsed.key).to.equal("fetch-user");
        expect(parsed.type).to.equal("http_fetch");
        expect(parsed.settings.method).to.equal("get");
      });
  });

  describe("given a reusable request key that does not exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getReusableRequest", (stub) =>
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
      .command(["reusable-request get", "fetch-user"])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });
});
