import { test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/message-type/get", () => {
  const whoami = {
    account_name: "Collab.io",
    account_slug: "collab-io",
    service_token_name: "My cool token",
  };

  describe("given no message type key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["message-type get"])
      .exit(2)
      .it("exits with status 2");
  });

  describe("given a message type key arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getMessageType", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.messageType(),
          }),
        ),
      )
      .stdout()
      .command(["message-type get", "foo"])
      .it("calls apiV1 getMessageType with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getMessageType as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                messageTypeKey: "foo",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
              }),
          ),
        );
      });
  });

  describe("given a message type key arg, and flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getMessageType", (stub) =>
        stub.resolves(
          factory.resp({
            data: factory.messageType(),
          }),
        ),
      )
      .stdout()
      .command([
        "message-type get",
        "foo",
        "--hide-uncommitted-changes",
        "--environment",
        "development",
      ])
      .it("calls apiV1 getMessageType with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getMessageType as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                messageTypeKey: "foo",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "hide-uncommitted-changes": true,
                environment: "development",
              }),
          ),
        );
      });
  });

  describe("given a message type key that does not exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(KnockApiV1.prototype, "whoami", (stub) =>
        stub.resolves(factory.resp({ data: whoami })),
      )
      .stub(KnockApiV1.prototype, "getMessageType", (stub) =>
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
      .command(["message-type get", "foo"])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });
});
