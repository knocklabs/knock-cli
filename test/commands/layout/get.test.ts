import { test } from "@oclif/test";
import { isEqual } from "lodash";
import * as sinon from "sinon";

import { factory } from "@/../test/support";
import KnockApiV1 from "@/lib/api-v1";

describe("commands/email_layout/get", () => {
  describe("given no email layout key arg", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .command(["email_layout get"])
      .exit(2)
      .it("exists with status 2");
  });

  describe("given an email layout key arg, and no flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(
        KnockApiV1.prototype,
        "getEmailLayout",
        sinon.stub().resolves(
          factory.resp({
            data: factory.emailLayout(),
          }),
        ),
      )
      .stdout()
      .command(["email_layout get", "transactional"])
      .it("calls apiV1 getEmailLayout with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getEmailLayout as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                emailLayoutKey: "transactional",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                environment: "development",
              }),
          ),
        );
      });
  });

  describe("given an email layout key arg, and flags", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(
        KnockApiV1.prototype,
        "getEmailLayout",
        sinon.stub().resolves(
          factory.resp({
            data: factory.emailLayout(),
          }),
        ),
      )
      .stdout()
      .command([
        "email_layout get",
        "transactional",
        "--hide-uncommitted-changes",
        "--environment",
        "production",
        "--json",
      ])
      .it("calls apiV1 getEmailLayout with correct props", () => {
        sinon.assert.calledWith(
          KnockApiV1.prototype.getEmailLayout as any,
          sinon.match(
            ({ args, flags }) =>
              isEqual(args, {
                emailLayoutKey: "transactional",
              }) &&
              isEqual(flags, {
                "service-token": "valid-token",
                "hide-uncommitted-changes": true,
                environment: "production",
                json: true,
              }),
          ),
        );
      });
  });

  describe("given an email layout that does not exist", () => {
    test
      .env({ KNOCK_SERVICE_TOKEN: "valid-token" })
      .stub(
        KnockApiV1.prototype,
        "getEmailLayout",
        sinon.stub().resolves(
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
      .command(["email_layout get", "foo"])
      .catch("The resource you requested does not exist")
      .it("throws an error for resource not found");
  });
});
